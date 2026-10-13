import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorCode, type OtpRequestResult } from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { AppConfigService } from '../config/app-config.service';
import { OtpChallenge, type OtpChallengeDocument } from '../identity/schemas/otp-challenge.schema';
import type { UserDocument } from '../identity/schemas/user.schema';
import { UsersService } from '../identity/users.service';
import { OTP_DELIVERY_PROVIDER, type OtpDeliveryProvider } from './providers/otp-delivery.provider';

function hashCode(phone: string, code: string): string {
  // Binding the hash to the phone number prevents a code issued for one number
  // from ever validating against another.
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Phone one-time-code challenges.
 *
 * Codes are hashed, single-use, time-limited and attempt-limited. Requests for
 * unregistered numbers return the same response as registered ones so the
 * endpoint cannot be used to discover who has an account.
 */
@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpChallenge.name)
    private readonly challengeModel: Model<OtpChallengeDocument>,
    private readonly usersService: UsersService,
    private readonly config: AppConfigService,
    @Inject(OTP_DELIVERY_PROVIDER) private readonly delivery: OtpDeliveryProvider,
  ) {}

  async request(phone: string): Promise<OtpRequestResult> {
    const user = await this.usersService.findByPhone(phone);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    // Previous challenges for this number are invalidated so that only the most
    // recently sent code can ever be used.
    await this.challengeModel
      .updateMany({ phone, consumedAt: { $exists: false } }, { $set: { consumedAt: new Date() } })
      .exec();

    await this.challengeModel.create({
      phone,
      userId: user?._id,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(Date.now() + this.config.otpTtlSeconds * 1000),
      attempts: 0,
    });

    if (user) {
      await this.delivery.send(phone, code);
    }

    return {
      sent: true,
      expiresInSeconds: this.config.otpTtlSeconds,
      ...(this.config.exposeOtpDebugCode ? { debugCode: code } : {}),
    };
  }

  /** Consumes a valid code and returns the owning account. */
  async verify(phone: string, code: string): Promise<UserDocument> {
    const challenge = await this.challengeModel
      .findOne({ phone, consumedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .exec();

    if (!challenge) {
      throw AppException.unauthenticated(
        'That code is not valid. Request a new one.',
        ErrorCode.OTP_INVALID,
      );
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      challenge.consumedAt = new Date();
      await challenge.save();
      throw AppException.unauthenticated(
        'That code has expired. Request a new one.',
        ErrorCode.OTP_EXPIRED,
      );
    }

    if (challenge.attempts >= this.config.otpMaxAttempts) {
      challenge.consumedAt = new Date();
      await challenge.save();
      throw AppException.unauthenticated(
        'Too many incorrect attempts. Request a new code.',
        ErrorCode.OTP_ATTEMPTS_EXCEEDED,
      );
    }

    if (!hashesMatch(challenge.codeHash, hashCode(phone, code))) {
      challenge.attempts += 1;
      await challenge.save();
      throw AppException.unauthenticated(
        'That code is not valid. Check it and try again.',
        ErrorCode.OTP_INVALID,
      );
    }

    challenge.consumedAt = new Date();
    await challenge.save();

    const user = challenge.userId ? await this.usersService.findById(challenge.userId) : null;
    if (!user) {
      // The challenge was created for an unregistered number: the code is
      // correct but there is no account to sign in to.
      throw AppException.unauthenticated(
        'That code is not valid. Check it and try again.',
        ErrorCode.OTP_INVALID,
      );
    }

    return user;
  }
}
