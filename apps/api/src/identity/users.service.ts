import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ErrorCode, UserStatus, type CurrentUser, type UserRole } from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { User, type UserDocument } from './schemas/user.schema';

export interface CreateUserInput {
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  cannyId?: string;
  fullName: string;
  avatarUrl?: string;
  schoolId?: Types.ObjectId;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    return this.userModel.create(input);
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async findByIdOrFail(id: string | Types.ObjectId): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw AppException.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  /** Includes the password hash, which is excluded from ordinary reads. */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findByCannyId(cannyId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ cannyId: cannyId.toUpperCase() }).exec();
  }

  /**
   * Rejects a duplicate email or phone before the write.
   *
   * The unique indexes remain the real guarantee; this exists so the caller gets
   * a precise field-level message instead of a generic conflict.
   */
  async assertCredentialsAvailable(email: string, phone: string): Promise<void> {
    const [emailTaken, phoneTaken] = await Promise.all([
      this.userModel.exists({ email: email.toLowerCase() }),
      this.userModel.exists({ phone }),
    ]);

    if (emailTaken) {
      throw AppException.conflict(
        'An account already exists for that email address.',
        ErrorCode.EMAIL_ALREADY_REGISTERED,
      );
    }
    if (phoneTaken) {
      throw AppException.conflict(
        'An account already exists for that phone number.',
        ErrorCode.PHONE_ALREADY_REGISTERED,
      );
    }
  }

  /** Throws unless the account may authenticate right now. */
  assertCanAuthenticate(user: UserDocument): void {
    if (user.status === UserStatus.SUSPENDED) {
      throw AppException.forbidden(
        'This account has been suspended. Contact your school administrator.',
        ErrorCode.ACCOUNT_SUSPENDED,
      );
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw AppException.forbidden('This account is not active.', ErrorCode.ACCOUNT_NOT_ACTIVE);
    }
  }

  async recordLogin(userId: Types.ObjectId): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } }).exec();
  }

  /**
   * Takes the document rather than an id so the in-memory copy stays in step
   * with the stored value; the caller usually serialises that same document
   * into the response immediately afterwards.
   */
  async markPhoneVerified(user: UserDocument): Promise<void> {
    if (user.phoneVerified) {
      return;
    }
    user.phoneVerified = true;
    await this.userModel.updateOne({ _id: user._id }, { $set: { phoneVerified: true } }).exec();
  }

  async updateIdentityFields(
    userId: Types.ObjectId,
    updates: { fullName?: string; avatarUrl?: string | null },
  ): Promise<void> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, unknown> = {};

    if (updates.fullName !== undefined) {
      set.fullName = updates.fullName;
    }
    if (updates.avatarUrl === null) {
      unset.avatarUrl = '';
    } else if (updates.avatarUrl !== undefined) {
      set.avatarUrl = updates.avatarUrl;
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return;
    }

    await this.userModel
      .updateOne(
        { _id: userId },
        {
          ...(Object.keys(set).length > 0 ? { $set: set } : {}),
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
      )
      .exec();
  }

  /** Account view for the authenticated owner. Contact details appear only here. */
  static toCurrentUser(user: UserDocument): CurrentUser {
    return {
      id: user._id.toString(),
      cannyId: user.cannyId ?? null,
      role: user.role,
      status: user.status,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      schoolId: user.schoolId ? user.schoolId.toString() : null,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
