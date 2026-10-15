import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BadgeKey, ReactionKind, type UserRole } from '@ncanny/types';

@Schema({ _id: false })
export class AwardedBadgeRecord {
  @Prop({ type: String, required: true, enum: Object.values(BadgeKey) })
  key!: BadgeKey;

  @Prop({ type: Types.ObjectId, required: true })
  awardedByUserId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  awardedByName!: string;

  @Prop({ type: String, required: true })
  awardedByCannyId!: string;

  @Prop({ type: Date, required: true })
  awardedAt!: Date;
}

export const AwardedBadgeSchema = SchemaFactory.createForClass(AwardedBadgeRecord);

@Schema({ collection: 'work_reactions', timestamps: true })
export class WorkReaction {
  @Prop({ type: Types.ObjectId, required: true })
  workId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ReactionKind) })
  kind!: ReactionKind;
}

export type WorkReactionDocument = HydratedDocument<WorkReaction>;
export const WorkReactionSchema = SchemaFactory.createForClass(WorkReaction);
WorkReactionSchema.index({ userId: 1, workId: 1, kind: 1 }, { unique: true });

@Schema({ collection: 'work_comments', timestamps: { createdAt: true, updatedAt: false } })
export class WorkCommentRecord {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  workId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  schoolId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  authorUserId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  authorName!: string;

  @Prop({ type: String, required: true })
  authorCannyId!: string;

  @Prop({ type: String, required: true })
  authorRole!: UserRole;

  @Prop({ type: String, required: true, maxlength: 500 })
  body!: string;

  createdAt!: Date;
}

export type WorkCommentDocument = HydratedDocument<WorkCommentRecord>;
export const WorkCommentSchema = SchemaFactory.createForClass(WorkCommentRecord);
WorkCommentSchema.index({ workId: 1, createdAt: -1 });

@Schema({ collection: 'work_bookmarks', timestamps: true })
export class WorkBookmark {
  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  workId!: Types.ObjectId;
}

export type WorkBookmarkDocument = HydratedDocument<WorkBookmark>;
export const WorkBookmarkSchema = SchemaFactory.createForClass(WorkBookmark);
WorkBookmarkSchema.index({ userId: 1, workId: 1 }, { unique: true });
