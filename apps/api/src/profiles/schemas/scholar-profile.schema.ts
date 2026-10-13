import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ALL_GRADE_LEVELS,
  DEFAULT_SCHOLAR_VISIBILITY,
  Visibility,
  type GradeLevel,
  type ScholarContentStats,
} from '@ncanny/types';
import { Progression, ProgressionSchema } from './progression.schema';

@Schema({ _id: false })
class ContentCounts implements ScholarContentStats {
  @Prop({ type: Number, default: 0 }) paintings!: number;
  @Prop({ type: Number, default: 0 }) essays!: number;
  @Prop({ type: Number, default: 0 }) elocutions!: number;
  @Prop({ type: Number, default: 0 }) studyActivities!: number;
  @Prop({ type: Number, default: 0 }) total!: number;
}

const ContentCountsSchema = SchemaFactory.createForClass(ContentCounts);

/** The academic identity of a student. One per Scholar account. */
@Schema({ collection: 'scholar_profiles', timestamps: true })
export class ScholarProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, uppercase: true })
  cannyId!: string;

  @Prop({ type: Types.ObjectId, ref: 'School', required: true, index: true })
  schoolId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ALL_GRADE_LEVELS, index: true })
  grade!: GradeLevel;

  @Prop({ type: String })
  section?: string;

  @Prop({ type: String, maxlength: 400 })
  bio?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [], index: true })
  subjectIds!: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] })
  interestedSubjectIds!: Types.ObjectId[];

  /** Defaults to SCHOOL rather than PUBLIC: these are minors (docs/SECURITY.md). */
  @Prop({
    type: String,
    enum: Object.values(Visibility),
    default: DEFAULT_SCHOLAR_VISIBILITY,
    index: true,
  })
  visibility!: Visibility;

  @Prop({ type: ProgressionSchema, default: () => ({}) })
  progression!: Progression;

  @Prop({ type: ContentCountsSchema, default: () => ({}) })
  contentStats!: ContentCounts;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ScholarProfileDocument = HydratedDocument<ScholarProfile>;
export const ScholarProfileSchema = SchemaFactory.createForClass(ScholarProfile);

ScholarProfileSchema.index({ schoolId: 1, grade: 1 });
ScholarProfileSchema.index({ 'progression.xp': -1 });

export const EMPTY_CONTENT_STATS: ScholarContentStats = {
  paintings: 0,
  essays: 0,
  elocutions: 0,
  studyActivities: 0,
  total: 0,
};
