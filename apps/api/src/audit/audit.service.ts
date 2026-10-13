import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppLogger } from '../common/logging/app-logger.service';
import { AuditLog, type AuditAction, type AuditLogDocument } from './audit-log.schema';

export interface AuditEntryInput {
  action: AuditAction;
  actorId?: string | Types.ObjectId;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only record of security-relevant actions.
 *
 * Writes never block or fail the operation being audited: losing an audit row
 * is bad, but failing a student's sign-in because the audit write failed is worse.
 * Failures are logged at error level so they are still visible.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('AuditService');
  }

  async record(entry: AuditEntryInput): Promise<void> {
    try {
      await this.auditModel.create({
        ...entry,
        actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : undefined,
        success: entry.success ?? true,
      });
    } catch (error) {
      this.logger.error('Failed to write audit entry', undefined, {
        action: entry.action,
        requestId: entry.requestId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
