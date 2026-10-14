import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MediaKind } from '@ncanny/types';

@Schema({ collection: 'media_assets', timestamps: { createdAt: true, updatedAt: false } })
export class MediaAsset {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(MediaKind) })
  kind!: MediaKind;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: Number, required: true })
  byteSize!: number;

  /** Random file name inside the media root. Never derived from user input. */
  @Prop({ type: String, required: true })
  storageKey!: string;

  createdAt!: Date;
}

export type MediaAssetDocument = HydratedDocument<MediaAsset>;
export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
