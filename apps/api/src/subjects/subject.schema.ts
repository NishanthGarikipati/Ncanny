import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ALL_GRADE_LEVELS, type GradeLevel, type Subject as SubjectDto } from '@ncanny/types';

@Schema({ collection: 'subjects', timestamps: true })
export class Subject {
  /** Stable slug used in URLs and configuration; never renamed. */
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  code!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  /** Icon key resolved by the design system, so the API never stores asset URLs. */
  @Prop({ type: String })
  icon?: string;

  @Prop({ type: String })
  colour?: string;

  /** Grades for which the subject is offered; empty means every grade. */
  @Prop({ type: [String], default: [], enum: ALL_GRADE_LEVELS })
  grades!: GradeLevel[];

  @Prop({ type: Number, default: 100 })
  sortOrder!: number;

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SubjectDocument = HydratedDocument<Subject>;
export const SubjectSchema = SchemaFactory.createForClass(Subject);

SubjectSchema.index({ sortOrder: 1, name: 1 });

export function toSubjectDto(subject: SubjectDocument): SubjectDto {
  return {
    id: subject._id.toString(),
    code: subject.code,
    name: subject.name,
    description: subject.description,
    icon: subject.icon,
    colour: subject.colour,
    grades: subject.grades,
    sortOrder: subject.sortOrder,
  };
}
