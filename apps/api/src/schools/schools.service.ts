import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  ErrorCode,
  MAX_PAGE_SIZE,
  UserRole,
  type Address,
  type PaginatedResult,
  type SchoolSummary,
} from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { School, normaliseSchoolName, toSchoolSummary, type SchoolDocument } from './school.schema';

export interface SchoolSelection {
  schoolId?: string;
  schoolName?: string;
  schoolAddress?: Address;
}

export interface ResolvedSchool {
  school: SchoolDocument;
  created: boolean;
}

@Injectable()
export class SchoolsService {
  constructor(@InjectModel(School.name) private readonly schoolModel: Model<SchoolDocument>) {}

  async findById(id: string): Promise<SchoolDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.schoolModel.findById(id).exec();
  }

  async findByIdOrFail(id: string): Promise<SchoolDocument> {
    const school = await this.findById(id);
    if (!school) {
      throw AppException.notFound('School not found', ErrorCode.SCHOOL_NOT_FOUND);
    }
    return school;
  }

  /**
   * Resolves the school a registration belongs to, creating an unverified
   * record when the school is not yet on the platform (see DL-0011).
   */
  async resolveForRegistration(selection: SchoolSelection): Promise<ResolvedSchool> {
    if (selection.schoolId) {
      return { school: await this.findByIdOrFail(selection.schoolId), created: false };
    }

    if (!selection.schoolName || !selection.schoolAddress) {
      throw AppException.badRequest('Select a school, or provide the school name and address.');
    }

    const normalisedName = normaliseSchoolName(selection.schoolName);
    const existing = await this.schoolModel
      .findOne({ normalisedName, 'address.city': selection.schoolAddress.city })
      .exec();

    if (existing) {
      return { school: existing, created: false };
    }

    const created = await this.schoolModel.create({
      name: selection.schoolName.trim(),
      normalisedName,
      address: selection.schoolAddress,
      verified: false,
    });

    return { school: created, created: true };
  }

  async search(params: {
    q?: string;
    limit: number;
    cursor?: string;
  }): Promise<PaginatedResult<SchoolSummary>> {
    const limit = Math.min(params.limit, MAX_PAGE_SIZE);
    const filter: FilterQuery<SchoolDocument> = {};

    if (params.q) {
      // Prefix matching on the normalised name keeps search-as-you-type usable
      // without a full-text index, and the escape prevents regex injection.
      const escaped = params.q
        .trim()
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.normalisedName = { $regex: `^${escaped}` };
    }

    if (params.cursor) {
      if (!Types.ObjectId.isValid(params.cursor)) {
        throw AppException.badRequest('Invalid pagination cursor.');
      }
      filter._id = { $gt: new Types.ObjectId(params.cursor) };
    }

    const schools = await this.schoolModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .exec();

    const hasMore = schools.length > limit;
    const page = hasMore ? schools.slice(0, limit) : schools;

    return {
      items: page.map(toSchoolSummary),
      nextCursor: hasMore ? (page[page.length - 1]?._id.toString() ?? null) : null,
      hasMore,
    };
  }

  /** Keeps the displayed member counts in step with registrations. */
  async incrementMemberCount(schoolId: Types.ObjectId, role: UserRole): Promise<void> {
    const field =
      role === UserRole.SCHOLAR
        ? 'scholarCount'
        : role === UserRole.PRECEPTOR
          ? 'preceptorCount'
          : null;

    if (!field) {
      return;
    }

    await this.schoolModel.updateOne({ _id: schoolId }, { $inc: { [field]: 1 } }).exec();
  }
}
