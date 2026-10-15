import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ContentStatus,
  ContentType,
  ModerationStatus,
  Visibility,
  type MediaKind,
} from '@ncanny/types';
import { AwardedBadgeRecord, AwardedBadgeSchema } from './engagement.schema';

@Schema({ _id: false })
class WorkReviewRecord {
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  score!: number;

  @Prop({ type: String, required: true, maxlength: 2000 })
  feedback!: string;

  @Prop({ type: Types.ObjectId, required: true })
  reviewerUserId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  reviewerName!: string;

  @Prop({ type: String, required: true })
  reviewerCannyId!: string;

  @Prop({ type: Date, required: true })
  reviewedAt!: Date;
}

const WorkReviewSchema = SchemaFactory.createForClass(WorkReviewRecord);

@Schema({ collection: 'works', timestamps: true })
export class Work {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  authorUserId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  authorCannyId!: string;

  @Prop({ type: String, required: true })
  authorName!: string;

  @Prop({ type: String, required: true })
  authorRole!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  schoolId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ContentType) })
  type!: ContentType;

  @Prop({ type: String, required: true, trim: true, maxlength: 140 })
  title!: string;

  @Prop({ type: String, maxlength: 280 })
  summary?: string;

  @Prop({ type: String, maxlength: 20000 })
  body?: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  subjectId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  subjectName!: string;

  @Prop({ type: String, required: true, enum: Object.values(Visibility), default: Visibility.SCHOOL })
  visibility!: Visibility;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ContentStatus),
    default: ContentStatus.PUBLISHED,
    index: true,
  })
  status!: ContentStatus;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ModerationStatus),
    default: ModerationStatus.NOT_REVIEWED,
  })
  moderationStatus!: ModerationStatus;

  @Prop({ type: Types.ObjectId })
  mediaId?: Types.ObjectId;

  @Prop({ type: String })
  mediaKind?: MediaKind;

  @Prop({ type: WorkReviewSchema })
  review?: WorkReviewRecord;

  @Prop({ type: Number, default: 0, min: 0 })
  likeCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  smileCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  commentCount!: number;

  @Prop({ type: [AwardedBadgeSchema], default: [] })
  badges!: AwardedBadgeRecord[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type WorkDocument = HydratedDocument<Work>;
export const WorkSchema = SchemaFactory.createForClass(Work);

WorkSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
WorkSchema.index({ authorUserId: 1, createdAt: -1 });
