import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubscriptionStatus, type Address, type SchoolSummary } from '@ncanny/types';

@Schema({ _id: false })
class SchoolAddress implements Address {
  @Prop({ type: String, required: true }) line1!: string;
  @Prop({ type: String }) line2?: string;
  @Prop({ type: String, required: true }) city!: string;
  @Prop({ type: String }) state?: string;
  @Prop({ type: String }) postalCode?: string;
  @Prop({ type: String, required: true }) country!: string;
}

const SchoolAddressSchema = SchemaFactory.createForClass(SchoolAddress);

@Schema({ _id: false })
class Subscription {
  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.NONE,
  })
  status!: SubscriptionStatus;

  @Prop({ type: String }) plan?: string;
  @Prop({ type: Date }) renewalDate?: Date;
  /** Provider name only; provider-specific logic never reaches the domain model. */
  @Prop({ type: String }) provider?: string;
  @Prop({ type: String }) externalCustomerId?: string;
}

const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

@Schema({ collection: 'schools', timestamps: true })
export class School {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  /**
   * Lower-cased, whitespace-collapsed name used for duplicate detection and
   * case-insensitive search without a collation-dependent index.
   */
  @Prop({ type: String, required: true, index: true })
  normalisedName!: string;

  @Prop({ type: SchoolAddressSchema, required: true })
  address!: SchoolAddress;

  @Prop({ type: String })
  contactEmail?: string;

  @Prop({ type: String })
  contactPhone?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminUserId?: Types.ObjectId;

  /** False for schools auto-provisioned at registration (see DL-0011). */
  @Prop({ type: Boolean, default: false, index: true })
  verified!: boolean;

  @Prop({ type: Number, default: 0 })
  scholarCount!: number;

  @Prop({ type: Number, default: 0 })
  preceptorCount!: number;

  @Prop({ type: SubscriptionSchema, default: () => ({ status: SubscriptionStatus.NONE }) })
  subscription!: Subscription;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SchoolDocument = HydratedDocument<School>;
export const SchoolSchema = SchemaFactory.createForClass(School);

SchoolSchema.index({ normalisedName: 1, 'address.city': 1 });
SchoolSchema.index({ name: 'text' });

export function normaliseSchoolName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Public view: contact details and subscription are deliberately omitted. */
export function toSchoolSummary(school: SchoolDocument): SchoolSummary {
  return {
    id: school._id.toString(),
    name: school.name,
    address: {
      line1: school.address.line1,
      line2: school.address.line2,
      city: school.address.city,
      state: school.address.state,
      postalCode: school.address.postalCode,
      country: school.address.country,
    },
    verified: school.verified,
    scholarCount: school.scholarCount,
    preceptorCount: school.preceptorCount,
  };
}
