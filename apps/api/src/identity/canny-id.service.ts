import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorCode, UserRole } from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { User, type UserDocument } from './schemas/user.schema';

const PREFIX_BY_ROLE: Partial<Record<UserRole, string>> = {
  [UserRole.SCHOLAR]: 'NCS',
  [UserRole.PRECEPTOR]: 'NCP',
};

const DIGITS = 6;
const MAX_ATTEMPTS = 12;

/**
 * Issues Canny IDs — the permanent public academic identifier (see DL-0008).
 *
 * Values are random rather than sequential so that an ID discloses neither the
 * platform's user count nor a neighbouring account's identifier.
 */
@Injectable()
export class CannyIdService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  static prefixFor(role: UserRole): string | undefined {
    return PREFIX_BY_ROLE[role];
  }

  static format(role: UserRole, numeric: number): string {
    const prefix = PREFIX_BY_ROLE[role];
    if (!prefix) {
      throw AppException.internal(`Role ${role} does not receive a Canny ID`);
    }
    return `${prefix}-${String(numeric).padStart(DIGITS, '0')}`;
  }

  static isValid(cannyId: string): boolean {
    return /^NC[SP]-\d{6}$/.test(cannyId);
  }

  /** True for roles that carry a public academic identity. */
  static appliesTo(role: UserRole): boolean {
    return role in PREFIX_BY_ROLE;
  }

  async issue(role: UserRole): Promise<string> {
    if (!CannyIdService.appliesTo(role)) {
      throw AppException.internal(`Role ${role} does not receive a Canny ID`);
    }

    const upperBound = 10 ** DIGITS;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const candidate = CannyIdService.format(role, randomInt(0, upperBound));
      const existing = await this.userModel.exists({ cannyId: candidate });
      if (!existing) {
        return candidate;
      }
    }

    // A unique index still protects correctness; this only reports exhaustion of
    // the retry budget, which means the ID space needs widening.
    throw new AppException(
      ErrorCode.CANNY_ID_GENERATION_FAILED,
      'Could not allocate a Canny ID. Please try again.',
      503,
    );
  }
}
