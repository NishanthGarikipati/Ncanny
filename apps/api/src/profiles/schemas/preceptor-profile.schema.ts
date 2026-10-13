import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  DEFAULT_PRECEPTOR_VISIBILITY,
  Visibility,
  type PreceptorInteractionStats,
} from '@ncanny/types';
import { Progression, ProgressionSchema } from './progression.schema';

@Schema({ _id: false })
class InteractionCounts implements PreceptorInteractionStats {
  @Prop({ type: Number, default: 0 }) scholarsInteractedWith!: number;
  @Prop({ type: Number, default: 0 }) submissionsReviewed!: number;
  @Prop({ type: Number, default: 0 }) feedbackProvided!: number;
  @Prop({ type: Number, default: 0 }) marksProvided!: number;
  @Prop({ type: Number, default: 0 }) badgesAwarded!: number;
  @Prop({ type: Number, default: 0 }) contentUploaded!: number;
}

const InteractionCountsSchema = SchemaFactory.createForClass(InteractionCounts);

/** The professional identity of a teacher. One per Preceptor account. */
@Schema({ collection: 'preceptor_profiles', timestamps: true })
export class PreceptorProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, uppercase: true })
  cannyId!: string;

  @Prop({ type: Types.ObjectId, ref: 'School', required: true, index: true })
  schoolId!: Types.ObjectId;

  /** Job title within the school, e.g. "Senior Science Preceptor". */
  @Prop({ type: String })
  preceptorRole?: string;

  @Prop({ type: String, maxlength: 400 })
  bio?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [], index: true })
  teachingSubjectIds!: Types.ObjectId[];

  /** Free-text expertise beyond the taught subjects, e.g. "Olympiad coaching". */
  @Prop({ type: [String], default: [] })
  knowledgeAreas!: string[];

  @Prop({ type: Number, min: 0, max: 70 })
  yearsOfExperience?: number;

  @Prop({
    type: String,
    enum: Object.values(Visibility),
    default: DEFAULT_PRECEPTOR_VISIBILITY,
    index: true,
  })
  visibility!: Visibility;

  @Prop({ type: ProgressionSchema, default: () => ({}) })
  progression!: Progression;

  @Prop({ type: InteractionCountsSchema, default: () => ({}) })
  interactionStats!: InteractionCounts;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PreceptorProfileDocument = HydratedDocument<PreceptorProfile>;
export const PreceptorProfileSchema = SchemaFactory.createForClass(PreceptorProfile);

export const EMPTY_INTERACTION_STATS: PreceptorInteractionStats = {
  scholarsInteractedWith: 0,
  submissionsReviewed: 0,
  feedbackProvided: 0,
  marksProvided: 0,
  badgesAwarded: 0,
  contentUploaded: 0,
};
