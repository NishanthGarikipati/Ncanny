import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ProgressionStats } from '@ncanny/types';

/**
 * Gamification figures carried by every profile.
 *
 * Values are maintained by the gamification domain (Epic 8) and are stored
 * denormalised on the profile so that rendering a profile never requires
 * aggregating the event history.
 */
@Schema({ _id: false })
export class Progression implements Omit<ProgressionStats, 'rank'> {
  @Prop({ type: Number, default: 0, min: 0 })
  xp!: number;

  @Prop({ type: Number, default: 1, min: 1 })
  level!: number;

  /** Null until the user has enough activity to be ranked meaningfully. */
  @Prop({ type: Number, default: null })
  rank!: number | null;

  @Prop({ type: Number, default: 0, min: 0 })
  badgeCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  streakDays!: number;
}

export const ProgressionSchema = SchemaFactory.createForClass(Progression);

export const EMPTY_PROGRESSION: ProgressionStats = {
  xp: 0,
  level: 1,
  rank: null,
  badgeCount: 0,
  streakDays: 0,
};
