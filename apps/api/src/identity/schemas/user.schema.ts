import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AVATAR_PRESETS, UserRole, UserStatus, type AvatarPreset } from '@ncanny/types';

/**
 * Account record. Deliberately holds only identity and credentials — academic
 * detail lives on the role profile, so profile reads never touch credentials.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  phone!: string;

  /** bcrypt hash. Excluded from query results unless explicitly selected. */
  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, required: true, enum: Object.values(UserRole), index: true })
  role!: UserRole;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
    index: true,
  })
  status!: UserStatus;

  /** Permanent public identifier. Absent for administrator accounts. */
  @Prop({ type: String, unique: true, sparse: true, uppercase: true, trim: true })
  cannyId?: string;

  @Prop({ type: String, required: true, trim: true })
  fullName!: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: String, enum: AVATAR_PRESETS })
  avatarPreset?: AvatarPreset;

  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  schoolId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  emailVerified!: boolean;

  @Prop({ type: Boolean, default: false })
  phoneVerified!: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ schoolId: 1, role: 1 });
UserSchema.index({ createdAt: -1 });
