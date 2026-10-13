import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ContentStatus,
  ContentType,
  DEFAULT_SCHOLAR_VISIBILITY,
  ErrorCode,
  ModerationStatus,
  PRECEPTOR_CONTENT_TYPES,
  SCHOLAR_CONTENT_TYPES,
  UserRole,
  type AcademicHall,
  type AccessTokenClaims,
  type MediaPayload,
  type PaginatedResult,
  type StoredMedia,
  type WorkCard,
  type WorkDetail,
} from '@ncanny/types';
import type { CreateWorkInput, ReviewWorkInput, WorkFeedInput } from '@ncanny/validation';
import { AuditAction } from '../audit/audit-log.schema';
import { AuditService } from '../audit/audit.service';

interface RequestAudit {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}
import { AppException } from '../common/errors/app.exception';
import { UsersService } from '../identity/users.service';
import { canViewProfile, type Viewer } from '../profiles/visibility.policy';
import { ProfilesService } from '../profiles/profiles.service';
import { SubjectsService } from '../subjects/subjects.service';
import { HallPresenceRecord, type HallPresenceDocument } from './schemas/hall-presence.schema';
import { MediaAsset, type MediaAssetDocument } from './schemas/media-asset.schema';
import { Work, type WorkDocument } from './schemas/content.schema';
import { MediaStorage } from './media.storage';

const HALL_WORK_LIMIT = 24;
const HALL_PRESENCE_LIMIT = 12;

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Work.name) private readonly works: Model<WorkDocument>,
    @InjectModel(MediaAsset.name) private readonly media: Model<MediaAssetDocument>,
    @InjectModel(HallPresenceRecord.name) private readonly presence: Model<HallPresenceDocument>,
    private readonly storage: MediaStorage,
    private readonly users: UsersService,
    private readonly subjects: SubjectsService,
    private readonly profiles: ProfilesService,
    private readonly audit: AuditService,
  ) {}

  async storeMedia(
    claims: AccessTokenClaims,
    input: { mimeType: string; dataBase64: string },
    context: RequestAudit,
  ): Promise<StoredMedia> {
    const saved = await this.storage.save(input.mimeType, input.dataBase64);
    const asset = await this.media.create({
      ownerUserId: new Types.ObjectId(claims.sub),
      kind: saved.sniffed.kind,
      mimeType: saved.sniffed.mimeType,
      byteSize: saved.byteSize,
      storageKey: saved.storageKey,
    });
    await this.audit.record({
      action: AuditAction.MEDIA_STORED,
      actorId: claims.sub,
      resourceType: 'media',
      resourceId: asset._id.toString(),
      success: true,
      ...context,
    });
    return {
      id: asset._id.toString(),
      kind: asset.kind,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
    };
  }

  async create(claims: AccessTokenClaims, input: CreateWorkInput, context: RequestAudit): Promise<WorkDetail> {
    const author = await this.users.findByIdOrFail(claims.sub);
    if (!author.schoolId || !author.cannyId) {
      throw AppException.forbidden('Only Scholars and Preceptors can publish work.');
    }

    const allowed =
      author.role === UserRole.SCHOLAR
        ? SCHOLAR_CONTENT_TYPES
        : author.role === UserRole.PRECEPTOR
          ? PRECEPTOR_CONTENT_TYPES
          : [];
    if (!allowed.includes(input.type)) {
      throw AppException.forbidden('That kind of work is not available for your role.');
    }

    const [subjectId] = await this.subjects.assertAllExist([input.subjectId], 'subjectId');
    const catalogue = await this.subjects.list();
    const subjectName = catalogue.find((subject) => subject.id === input.subjectId)?.name;
    if (!subjectId || !subjectName) {
      throw AppException.badRequest('Choose a subject.', ErrorCode.SUBJECT_NOT_FOUND);
    }

    let mediaId: Types.ObjectId | undefined;
    let mediaKind: Work['mediaKind'];
    if (input.mediaId) {
      const asset = await this.media.findById(input.mediaId);
      if (!asset || asset.ownerUserId.toString() !== claims.sub) {
        throw AppException.badRequest('Upload the file again before publishing.', ErrorCode.MEDIA_UPLOAD_FAILED);
      }
      const imageTypes: ContentType[] = [ContentType.PAINTING];
      const audioTypes: ContentType[] = [ContentType.ELOCUTION, ContentType.TEACHER_VIDEO];
      if (imageTypes.includes(input.type) && asset.kind !== 'IMAGE') {
        throw AppException.badRequest('A painting needs an image.', ErrorCode.MEDIA_TYPE_UNSUPPORTED);
      }
      if (audioTypes.includes(input.type) && asset.kind !== 'AUDIO' && asset.kind !== 'IMAGE') {
        throw AppException.badRequest('That file does not match this kind of work.', ErrorCode.MEDIA_TYPE_UNSUPPORTED);
      }
      mediaId = asset._id;
      mediaKind = asset.kind;
    }

    const status = input.status ?? ContentStatus.PUBLISHED;
    const work = await this.works.create({
      authorUserId: author._id,
      authorCannyId: author.cannyId,
      authorName: author.fullName,
      authorRole: author.role,
      schoolId: author.schoolId,
      type: input.type,
      title: input.title,
      summary: input.summary,
      body: input.body,
      subjectId,
      subjectName,
      visibility: input.visibility ?? DEFAULT_SCHOLAR_VISIBILITY,
      status,
      moderationStatus: ModerationStatus.NOT_REVIEWED,
      mediaId,
      mediaKind,
    });

    if (status === ContentStatus.PUBLISHED) {
      if (author.role === UserRole.SCHOLAR) {
        await this.profiles.recordScholarPublication(claims.sub, input.type);
      } else if (author.role === UserRole.PRECEPTOR) {
        await this.profiles.recordPreceptorPublication(claims.sub);
      }
    }

    await this.audit.record({
      action: AuditAction.CONTENT_PUBLISHED,
      actorId: claims.sub,
      resourceType: 'work',
      resourceId: work._id.toString(),
      success: true,
      ...context,
    });

    return this.toDetail(work, claims);
  }

  async feed(claims: AccessTokenClaims, query: WorkFeedInput): Promise<PaginatedResult<WorkCard>> {
    const viewer = this.viewer(claims);
    if (!viewer.schoolId) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const limit = query.limit;
    const filter: Record<string, unknown> = {
      status: ContentStatus.PUBLISHED,
      schoolId: new Types.ObjectId(viewer.schoolId),
      visibility: { $in: ['SCHOOL', 'PUBLIC'] },
    };
    if (query.type) filter.type = query.type;
    if (query.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw AppException.badRequest('Invalid pagination cursor.');
      }
      filter._id = { $lt: new Types.ObjectId(query.cursor) };
    }

    const rows = await this.works
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((work) => this.toCard(work)),
      nextCursor: hasMore ? (page[page.length - 1]?._id.toString() ?? null) : null,
      hasMore,
    };
  }

  async mine(claims: AccessTokenClaims): Promise<WorkCard[]> {
    const rows = await this.works
      .find({ authorUserId: new Types.ObjectId(claims.sub), status: { $ne: ContentStatus.REMOVED } })
      .sort({ _id: -1 })
      .limit(50);
    return rows.map((work) => this.toCard(work));
  }

  async getById(id: string, claims: AccessTokenClaims | undefined): Promise<WorkDetail> {
    const work = await this.requireVisible(id, claims);
    return this.toDetail(work, claims);
  }

  async readMedia(id: string, claims: AccessTokenClaims | undefined): Promise<MediaPayload> {
    const work = await this.requireVisible(id, claims);
    if (!work.mediaId) {
      throw AppException.notFound('This work has no file.', ErrorCode.CONTENT_NOT_FOUND);
    }
    const asset = await this.media.findById(work.mediaId);
    if (!asset) {
      throw AppException.notFound('This work has no file.', ErrorCode.CONTENT_NOT_FOUND);
    }
    const bytes = await this.storage.read(asset.storageKey);
    return { mimeType: asset.mimeType, dataBase64: bytes.toString('base64') };
  }

  async review(
    id: string,
    claims: AccessTokenClaims,
    input: ReviewWorkInput,
    context: RequestAudit,
  ): Promise<WorkDetail> {
    if (claims.role !== UserRole.PRECEPTOR && claims.role !== UserRole.NCANNY_ADMIN) {
      throw AppException.forbidden('Only a Preceptor can mark work.', ErrorCode.INSUFFICIENT_ROLE);
    }
    const work = await this.requireVisible(id, claims);
    if (work.authorUserId.toString() === claims.sub) {
      throw AppException.forbidden('You cannot mark your own work.');
    }
    const reviewer = await this.users.findByIdOrFail(claims.sub);
    if (!reviewer.cannyId) {
      throw AppException.forbidden('A Canny ID is required to mark work.');
    }
    const alreadyReviewed = Boolean(work.review);
    work.review = {
      score: input.score,
      feedback: input.feedback,
      reviewerUserId: reviewer._id,
      reviewerName: reviewer.fullName,
      reviewerCannyId: reviewer.cannyId,
      reviewedAt: new Date(),
    };
    work.moderationStatus = ModerationStatus.APPROVED;
    await work.save();
    if (!alreadyReviewed && claims.role === UserRole.PRECEPTOR) {
      await this.profiles.recordPreceptorReview(claims.sub);
    }
    await this.audit.record({
      action: AuditAction.CONTENT_REVIEWED,
      actorId: claims.sub,
      resourceType: 'work',
      resourceId: work._id.toString(),
      success: true,
      ...context,
    });
    return this.toDetail(work, claims);
  }

  async report(id: string, claims: AccessTokenClaims, reason: string, context: RequestAudit): Promise<{ reported: true }> {
    const work = await this.requireVisible(id, claims);
    if (work.authorUserId.toString() === claims.sub) {
      throw AppException.badRequest('You cannot report your own work.');
    }
    work.moderationStatus = ModerationStatus.FLAGGED;
    await work.save();
    await this.audit.record({
      action: AuditAction.CONTENT_REPORTED,
      actorId: claims.sub,
      resourceType: 'work',
      resourceId: work._id.toString(),
      success: true,
      reason,
      ...context,
    });
    return { reported: true };
  }

  async hall(claims: AccessTokenClaims): Promise<AcademicHall> {
    const viewer = this.viewer(claims);
    if (!viewer.schoolId) {
      return { works: [], presence: [], viewerOptedIn: false };
    }
    const schoolId = new Types.ObjectId(viewer.schoolId);
    const [works, people, own] = await Promise.all([
      this.works
        .find({
          schoolId,
          status: ContentStatus.PUBLISHED,
          visibility: { $in: ['SCHOOL', 'PUBLIC'] },
        })
        .sort({ _id: -1 })
        .limit(HALL_WORK_LIMIT),
      this.presence.find({ schoolId, optedIn: true }).limit(HALL_PRESENCE_LIMIT),
      this.presence.findOne({ userId: new Types.ObjectId(claims.sub) }),
    ]);
    return {
      works: works.map((work) => this.toCard(work)),
      presence: people
        .filter((person) => person.userId.toString() !== claims.sub)
        .map((person) => ({
          cannyId: person.cannyId,
          fullName: person.fullName,
          role: person.role,
        })),
      viewerOptedIn: Boolean(own?.optedIn),
    };
  }

  async setPresence(claims: AccessTokenClaims, optedIn: boolean): Promise<{ optedIn: boolean }> {
    const user = await this.users.findByIdOrFail(claims.sub);
    if (!user.schoolId || !user.cannyId) {
      throw AppException.forbidden('The hall is for Scholars and Preceptors.');
    }
    await this.presence.updateOne(
      { userId: user._id },
      {
        $set: {
          schoolId: user.schoolId,
          cannyId: user.cannyId,
          fullName: user.fullName,
          role: user.role,
          optedIn,
        },
      },
      { upsert: true },
    );
    return { optedIn };
  }

  private async requireVisible(id: string, claims: AccessTokenClaims | undefined): Promise<WorkDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppException.notFound('No work is available with that id.', ErrorCode.CONTENT_NOT_FOUND);
    }
    const work = await this.works.findById(id);
    if (!work || work.status === ContentStatus.REMOVED) {
      throw AppException.notFound('No work is available with that id.', ErrorCode.CONTENT_NOT_FOUND);
    }
    const viewer = claims ? this.viewer(claims) : null;
    const visible = canViewProfile(
      {
        ownerUserId: work.authorUserId.toString(),
        schoolId: work.schoolId.toString(),
        visibility: work.visibility,
      },
      viewer,
    );
    // Drafts stay with the author. A hidden work and a missing work look the same.
    if (!visible || (work.status === ContentStatus.DRAFT && viewer?.userId !== work.authorUserId.toString())) {
      throw AppException.notFound('No work is available with that id.', ErrorCode.CONTENT_NOT_FOUND);
    }
    return work;
  }

  private viewer(claims: AccessTokenClaims): Viewer {
    return { userId: claims.sub, role: claims.role, schoolId: claims.schoolId };
  }

  private toCard(work: WorkDocument): WorkCard {
    return {
      id: work._id.toString(),
      type: work.type,
      title: work.title,
      summary: work.summary,
      authorName: work.authorName,
      authorCannyId: work.authorCannyId,
      authorRole: work.authorRole as WorkCard['authorRole'],
      subjectId: work.subjectId.toString(),
      subjectName: work.subjectName,
      visibility: work.visibility,
      status: work.status,
      moderationStatus: work.moderationStatus,
      hasMedia: Boolean(work.mediaId),
      mediaKind: work.mediaKind,
      review: work.review
        ? {
            score: work.review.score,
            maxScore: 100,
            feedback: work.review.feedback,
            reviewerName: work.review.reviewerName,
            reviewerCannyId: work.review.reviewerCannyId,
            reviewedAt: work.review.reviewedAt.toISOString(),
          }
        : undefined,
      createdAt: work.createdAt.toISOString(),
    };
  }

  private toDetail(work: WorkDocument, claims: AccessTokenClaims | undefined): WorkDetail {
    return {
      ...this.toCard(work),
      body: work.body,
      ownedByViewer: Boolean(claims && claims.sub === work.authorUserId.toString()),
    };
  }
}
