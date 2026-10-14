import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AnalyticsEvent,
  ContentType,
  ErrorCode,
  UserRole,
  type AccessTokenClaims,
  type GradeLevel,
  type PreceptorProfile as PreceptorProfileDto,
  type ScholarProfile as ScholarProfileDto,
  type Visibility,
} from '@ncanny/types';
import type { UpdatePreceptorProfileInput, UpdateScholarProfileInput } from '@ncanny/validation';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { AppException } from '../common/errors/app.exception';
import { AuditAction } from '../audit/audit-log.schema';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../identity/users.service';
import type { UserDocument } from '../identity/schemas/user.schema';
import { SchoolsService } from '../schools/schools.service';
import { toSchoolSummary, type SchoolDocument } from '../schools/school.schema';
import { SubjectsService } from '../subjects/subjects.service';
import {
  PreceptorProfile,
  type PreceptorProfileDocument,
} from './schemas/preceptor-profile.schema';
import { ScholarProfile, type ScholarProfileDocument } from './schemas/scholar-profile.schema';
import { canViewProfile, type Viewer } from './visibility.policy';

export interface CreateScholarProfileInput {
  userId: Types.ObjectId;
  cannyId: string;
  schoolId: Types.ObjectId;
  grade: GradeLevel;
  section?: string;
  subjectIds: Types.ObjectId[];
  interestedSubjectIds: Types.ObjectId[];
}

export interface CreatePreceptorProfileInput {
  userId: Types.ObjectId;
  cannyId: string;
  schoolId: Types.ObjectId;
  preceptorRole?: string;
  teachingSubjectIds: Types.ObjectId[];
  knowledgeAreas: string[];
  yearsOfExperience?: number;
}

export interface AuditContext {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function toViewer(claims?: AccessTokenClaims): Viewer | null {
  return claims ? { userId: claims.sub, role: claims.role, schoolId: claims.schoolId } : null;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(ScholarProfile.name)
    private readonly scholarModel: Model<ScholarProfileDocument>,
    @InjectModel(PreceptorProfile.name)
    private readonly preceptorModel: Model<PreceptorProfileDocument>,
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly subjectsService: SubjectsService,
    private readonly auditService: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ------------------------------------------------------------- creation

  async createScholarProfile(input: CreateScholarProfileInput): Promise<ScholarProfileDocument> {
    return this.scholarModel.create(input);
  }

  async createPreceptorProfile(
    input: CreatePreceptorProfileInput,
  ): Promise<PreceptorProfileDocument> {
    return this.preceptorModel.create(input);
  }

  // ------------------------------------------------------------------ read

  async getScholarByCannyId(
    cannyId: string,
    claims?: AccessTokenClaims,
  ): Promise<ScholarProfileDto> {
    const profile = await this.scholarModel.findOne({ cannyId: cannyId.toUpperCase() }).exec();
    if (!profile) {
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }

    this.assertVisible(profile.userId, profile.schoolId, profile.visibility, claims);

    const [user, school] = await this.loadOwnerAndSchool(profile.userId, profile.schoolId);
    this.analytics.track(
      AnalyticsEvent.PROFILE_VIEWED,
      { role: UserRole.SCHOLAR, self: claims?.sub === profile.userId.toString() },
      { userId: claims?.sub },
    );

    return this.toScholarDto(profile, user, school);
  }

  async getScholarForOwner(userId: string): Promise<ScholarProfileDto> {
    const profile = await this.scholarModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!profile) {
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }
    const [user, school] = await this.loadOwnerAndSchool(profile.userId, profile.schoolId);
    return this.toScholarDto(profile, user, school);
  }

  async getPreceptorByCannyId(
    cannyId: string,
    claims?: AccessTokenClaims,
  ): Promise<PreceptorProfileDto> {
    const profile = await this.preceptorModel.findOne({ cannyId: cannyId.toUpperCase() }).exec();
    if (!profile) {
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }

    this.assertVisible(profile.userId, profile.schoolId, profile.visibility, claims);

    const [user, school] = await this.loadOwnerAndSchool(profile.userId, profile.schoolId);
    this.analytics.track(
      AnalyticsEvent.PROFILE_VIEWED,
      { role: UserRole.PRECEPTOR, self: claims?.sub === profile.userId.toString() },
      { userId: claims?.sub },
    );

    return this.toPreceptorDto(profile, user, school);
  }

  async getPreceptorForOwner(userId: string): Promise<PreceptorProfileDto> {
    const profile = await this.preceptorModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!profile) {
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }
    const [user, school] = await this.loadOwnerAndSchool(profile.userId, profile.schoolId);
    return this.toPreceptorDto(profile, user, school);
  }

  // ---------------------------------------------------------------- update

  async updateScholarProfile(
    userId: string,
    updates: UpdateScholarProfileInput,
    context: AuditContext = {},
  ): Promise<ScholarProfileDto> {
    const profile = await this.scholarModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!profile) {
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }

    if (updates.subjectIds) {
      profile.subjectIds = await this.subjectsService.assertAllExist(
        updates.subjectIds,
        'subjectIds',
      );
    }
    if (updates.interestedSubjectIds) {
      profile.interestedSubjectIds = await this.subjectsService.assertAllExist(
        updates.interestedSubjectIds,
        'interestedSubjectIds',
      );
    }
    if (updates.grade !== undefined) {
      profile.grade = updates.grade;
    }
    if (updates.section !== undefined) {
      profile.section = updates.section;
    }
    if (updates.bio !== undefined) {
      profile.bio = updates.bio;
    }
    if (updates.visibility !== undefined) {
      profile.visibility = updates.visibility;
    }

    await profile.save();
    await this.applyIdentityUpdates(profile.userId, updates);
    await this.recordProfileUpdate(userId, Object.keys(updates), UserRole.SCHOLAR, context);

    const [user, school] = await this.loadOwnerAndSchool(profile.userId, profile.schoolId);
    return this.toScholarDto(profile, user, school);
  }

  async updatePreceptorProfile(
    userId: string,
    updates: UpdatePreceptorProfileInput,
    context: AuditContext = {},
  ): Promise<PreceptorProfileDto> {
    const profile = await this.preceptorModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!profile) {
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }

    if (updates.teachingSubjectIds) {
      profile.teachingSubjectIds = await this.subjectsService.assertAllExist(
        updates.teachingSubjectIds,
        'teachingSubjectIds',
      );
    }
    if (updates.knowledgeAreas !== undefined) {
      profile.knowledgeAreas = updates.knowledgeAreas;
    }
    if (updates.preceptorRole !== undefined) {
      profile.preceptorRole = updates.preceptorRole;
    }
    if (updates.yearsOfExperience !== undefined) {
      profile.yearsOfExperience = updates.yearsOfExperience;
    }
    if (updates.bio !== undefined) {
      profile.bio = updates.bio;
    }
    if (updates.visibility !== undefined) {
      profile.visibility = updates.visibility;
    }

    await profile.save();
    await this.applyIdentityUpdates(profile.userId, updates);
    await this.recordProfileUpdate(userId, Object.keys(updates), UserRole.PRECEPTOR, context);

    const [user, school] = await this.loadOwnerAndSchool(profile.userId, profile.schoolId);
    return this.toPreceptorDto(profile, user, school);
  }

  // --------------------------------------------------------------- helpers

  private assertVisible(
    ownerUserId: Types.ObjectId,
    schoolId: Types.ObjectId,
    visibility: Visibility,
    claims?: AccessTokenClaims,
  ): void {
    const allowed = canViewProfile(
      {
        ownerUserId: ownerUserId.toString(),
        schoolId: schoolId.toString(),
        visibility,
      },
      toViewer(claims),
    );

    if (!allowed) {
      // Reported as "not found" so that visibility settings cannot be probed to
      // confirm that a particular Canny ID exists.
      throw AppException.notFound('Profile not found', ErrorCode.PROFILE_NOT_FOUND);
    }
  }

  private async applyIdentityUpdates(
    userId: Types.ObjectId,
    updates: { fullName?: string; avatarUrl?: string | null },
  ): Promise<void> {
    if (updates.fullName === undefined && updates.avatarUrl === undefined) {
      return;
    }
    await this.usersService.updateIdentityFields(userId, {
      fullName: updates.fullName,
      avatarUrl: updates.avatarUrl,
    });
  }

  private async recordProfileUpdate(
    userId: string,
    fields: string[],
    role: UserRole,
    context: AuditContext,
  ): Promise<void> {
    await this.auditService.record({
      action: AuditAction.PROFILE_UPDATED,
      actorId: userId,
      resourceType: role === UserRole.SCHOLAR ? 'ScholarProfile' : 'PreceptorProfile',
      resourceId: userId,
      // Field names only: the values may be personal data and do not belong in
      // an audit record that is read by administrators.
      metadata: { fields },
      ...context,
    });

    this.analytics.track(
      AnalyticsEvent.PROFILE_UPDATED,
      { role, fieldCount: fields.length },
      { userId, requestId: context.requestId },
    );
  }

  private async loadOwnerAndSchool(
    userId: Types.ObjectId,
    schoolId: Types.ObjectId,
  ): Promise<[UserDocument, SchoolDocument]> {
    const [user, school] = await Promise.all([
      this.usersService.findByIdOrFail(userId),
      this.schoolsService.findByIdOrFail(schoolId.toString()),
    ]);
    return [user, school];
  }

  private toScholarDto(
    profile: ScholarProfileDocument,
    user: UserDocument,
    school: SchoolDocument,
  ): ScholarProfileDto {
    return {
      userId: user._id.toString(),
      cannyId: profile.cannyId,
      role: UserRole.SCHOLAR,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: profile.bio,
      school: toSchoolSummary(school),
      visibility: profile.visibility,
      createdAt: profile.createdAt.toISOString(),
      grade: profile.grade,
      section: profile.section,
      subjectIds: profile.subjectIds.map((id) => id.toString()),
      interestedSubjectIds: profile.interestedSubjectIds.map((id) => id.toString()),
      progression: {
        xp: profile.progression.xp,
        level: profile.progression.level,
        rank: profile.progression.rank,
        badgeCount: profile.progression.badgeCount,
        streakDays: profile.progression.streakDays,
      },
      contentStats: {
        paintings: profile.contentStats.paintings,
        essays: profile.contentStats.essays,
        elocutions: profile.contentStats.elocutions,
        studyActivities: profile.contentStats.studyActivities,
        total: profile.contentStats.total,
      },
    };
  }

  private toPreceptorDto(
    profile: PreceptorProfileDocument,
    user: UserDocument,
    school: SchoolDocument,
  ): PreceptorProfileDto {
    return {
      userId: user._id.toString(),
      cannyId: profile.cannyId,
      role: UserRole.PRECEPTOR,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: profile.bio,
      school: toSchoolSummary(school),
      visibility: profile.visibility,
      createdAt: profile.createdAt.toISOString(),
      preceptorRole: profile.preceptorRole,
      teachingSubjectIds: profile.teachingSubjectIds.map((id) => id.toString()),
      knowledgeAreas: profile.knowledgeAreas,
      yearsOfExperience: profile.yearsOfExperience,
      progression: {
        xp: profile.progression.xp,
        level: profile.progression.level,
        rank: profile.progression.rank,
        badgeCount: profile.progression.badgeCount,
        streakDays: profile.progression.streakDays,
      },
      interactionStats: {
        scholarsInteractedWith: profile.interactionStats.scholarsInteractedWith,
        submissionsReviewed: profile.interactionStats.submissionsReviewed,
        feedbackProvided: profile.interactionStats.feedbackProvided,
        marksProvided: profile.interactionStats.marksProvided,
        badgesAwarded: profile.interactionStats.badgesAwarded,
        contentUploaded: profile.interactionStats.contentUploaded,
      },
    };
  }

  /** Counts a newly published Scholar work. Drafts and archives do not call this. */
  async recordScholarPublication(userId: string, type: ContentType): Promise<void> {
    const fieldByType: Partial<Record<ContentType, string>> = {
      [ContentType.PAINTING]: 'contentStats.paintings',
      [ContentType.ESSAY]: 'contentStats.essays',
      [ContentType.ELOCUTION]: 'contentStats.elocutions',
      [ContentType.STUDY_ACTIVITY]: 'contentStats.studyActivities',
    };
    const field = fieldByType[type];
    if (!field) {
      return;
    }
    await this.scholarModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $inc: { [field]: 1, 'contentStats.total': 1 } },
    );
  }

  async recordPreceptorPublication(userId: string): Promise<void> {
    await this.preceptorModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $inc: { 'interactionStats.contentUploaded': 1 } },
    );
  }

  async recordPreceptorReview(userId: string): Promise<void> {
    await this.preceptorModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      {
        $inc: {
          'interactionStats.submissionsReviewed': 1,
          'interactionStats.feedbackProvided': 1,
          'interactionStats.marksProvided': 1,
        },
      },
    );
  }
}
