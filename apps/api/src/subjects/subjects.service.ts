import { Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ErrorCode, type Subject as SubjectDto } from '@ncanny/types';
import { CacheService } from '../common/cache/cache.service';
import { AppException } from '../common/errors/app.exception';
import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { SUBJECT_CATALOGUE } from './subject-catalogue';
import { Subject, toSubjectDto, type SubjectDocument } from './subject.schema';

const CACHE_KEY = 'subjects:list';
const CACHE_TTL_SECONDS = 300;

@Injectable()
export class SubjectsService implements OnModuleInit {
  constructor(
    @InjectModel(Subject.name) private readonly subjectModel: Model<SubjectDocument>,
    private readonly cache: CacheService,
    private readonly logger: AppLogger,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext('SubjectsService');
  }

  async onModuleInit(): Promise<void> {
    // Tests seed explicitly so that each suite controls its own fixtures.
    if (this.config.isTest) {
      return;
    }
    await this.seed();
  }

  /** Idempotent: safe to run on every boot and re-runnable after catalogue edits. */
  async seed(): Promise<number> {
    const operations = SUBJECT_CATALOGUE.map((subject) => ({
      updateOne: {
        filter: { code: subject.code },
        update: { $set: subject },
        upsert: true,
      },
    }));

    const result = await this.subjectModel.bulkWrite(operations);
    await this.cache.delete(CACHE_KEY);

    const changed = result.upsertedCount + result.modifiedCount;
    if (changed > 0) {
      this.logger.log('Subject catalogue synchronised', {
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      });
    }
    return changed;
  }

  async list(): Promise<SubjectDto[]> {
    return this.cache.wrap(CACHE_KEY, CACHE_TTL_SECONDS, async () => {
      const subjects = await this.subjectModel
        .find({ active: true })
        .sort({ sortOrder: 1, name: 1 })
        .exec();
      return subjects.map(toSubjectDto);
    });
  }

  async findByIds(ids: string[]): Promise<SubjectDocument[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) {
      return [];
    }
    return this.subjectModel.find({ _id: { $in: objectIds }, active: true }).exec();
  }

  /**
   * Verifies that every supplied subject id exists, so a profile can never hold
   * a reference to a subject that was never in the catalogue.
   */
  async assertAllExist(ids: string[], field: string): Promise<Types.ObjectId[]> {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) {
      return [];
    }

    const found = await this.findByIds(unique);
    if (found.length !== unique.length) {
      throw AppException.validation('One or more selected subjects do not exist.', [
        { field, message: 'Select subjects from the Ncanny subject list' },
      ]);
    }

    return found.map((subject) => subject._id);
  }

  async findByCodeOrFail(code: string): Promise<SubjectDocument> {
    const subject = await this.subjectModel.findOne({ code: code.toLowerCase() }).exec();
    if (!subject) {
      throw AppException.notFound('Subject not found', ErrorCode.SUBJECT_NOT_FOUND);
    }
    return subject;
  }
}
