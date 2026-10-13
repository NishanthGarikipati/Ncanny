import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * A refresh-token family for one device.
 *
 * The refresh token itself is stored only as a SHA-256 hash: a database leak
 * must not yield usable session credentials. Rotation replaces the hash, so a
 * previously valid token presented again indicates theft (see `replacedAt`).
 */
@Schema({ collection: 'user_sessions', timestamps: true })
export class UserSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  refreshTokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, required: true, default: () => new Date() })
  lastUsedAt!: Date;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: String })
  revokedReason?: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserSessionDocument = HydratedDocument<UserSession>;
export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

UserSessionSchema.index({ userId: 1, revokedAt: 1 });
// Expired sessions are removed by MongoDB rather than by a cleanup job.
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
