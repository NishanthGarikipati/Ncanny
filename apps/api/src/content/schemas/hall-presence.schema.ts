import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '@ncanny/types';

/** Opt-in appearance in the academic hall. No contact details are stored here. */
@Schema({ collection: 'hall_presence', timestamps: true })
export class HallPresenceRecord {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  schoolId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  cannyId!: string;

  @Prop({ type: String, required: true })
  fullName!: string;

  @Prop({ type: String, required: true, enum: Object.values(UserRole) })
  role!: UserRole;

  @Prop({ type: Boolean, required: true, default: false })
  optedIn!: boolean;
}

export type HallPresenceDocument = HydratedDocument<HallPresenceRecord>;
export const HallPresenceSchema = SchemaFactory.createForClass(HallPresenceRecord);
