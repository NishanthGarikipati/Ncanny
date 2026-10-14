import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const AuditAction = {
  USER_REGISTERED: 'USER_REGISTERED',
  LOGIN_SUCCEEDED: 'LOGIN_SUCCEEDED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  OTP_REQUESTED: 'OTP_REQUESTED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  LOGOUT: 'LOGOUT',
  LOGOUT_ALL: 'LOGOUT_ALL',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  SCHOOL_CREATED: 'SCHOOL_CREATED',
  MEDIA_STORED: 'MEDIA_STORED',
  CONTENT_PUBLISHED: 'CONTENT_PUBLISHED',
  CONTENT_REVIEWED: 'CONTENT_REVIEWED',
  CONTENT_REPORTED: 'CONTENT_REPORTED',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: Types.ObjectId, index: true })
  actorId?: Types.ObjectId;

  @Prop({ type: String, index: true, required: true })
  action!: AuditAction;

  /** Resource type and id the action applied to, when there is one. */
  @Prop({ type: String })
  resourceType?: string;

  @Prop({ type: String })
  resourceId?: string;

  @Prop({ type: Boolean, required: true, default: true })
  success!: boolean;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String, index: true })
  requestId?: string;

  /** Non-sensitive supporting detail. Never contains credentials or content bodies. */
  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt!: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
