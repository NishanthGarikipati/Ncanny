/**
 * Grade/class levels. Stored as a stable code rather than a localised label so
 * that the label can change per region without a data migration.
 */
export const GradeLevel = {
  GRADE_1: 'GRADE_1',
  GRADE_2: 'GRADE_2',
  GRADE_3: 'GRADE_3',
  GRADE_4: 'GRADE_4',
  GRADE_5: 'GRADE_5',
  GRADE_6: 'GRADE_6',
  GRADE_7: 'GRADE_7',
  GRADE_8: 'GRADE_8',
  GRADE_9: 'GRADE_9',
  GRADE_10: 'GRADE_10',
  GRADE_11: 'GRADE_11',
  GRADE_12: 'GRADE_12',
} as const;

export type GradeLevel = (typeof GradeLevel)[keyof typeof GradeLevel];

export const ALL_GRADE_LEVELS: readonly GradeLevel[] = Object.values(GradeLevel);

export const GRADE_LABELS: Record<GradeLevel, string> = {
  GRADE_1: 'Grade 1',
  GRADE_2: 'Grade 2',
  GRADE_3: 'Grade 3',
  GRADE_4: 'Grade 4',
  GRADE_5: 'Grade 5',
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
  GRADE_12: 'Grade 12',
};

/**
 * Grade bands used to normalise ranking, so that a Grade 3 Scholar is never
 * ranked directly against a Grade 12 Scholar (see docs/GAME_DESIGN.md).
 */
export const GRADE_BANDS: Record<string, readonly GradeLevel[]> = {
  PRIMARY: [
    GradeLevel.GRADE_1,
    GradeLevel.GRADE_2,
    GradeLevel.GRADE_3,
    GradeLevel.GRADE_4,
    GradeLevel.GRADE_5,
  ],
  MIDDLE: [GradeLevel.GRADE_6, GradeLevel.GRADE_7, GradeLevel.GRADE_8],
  SECONDARY: [GradeLevel.GRADE_9, GradeLevel.GRADE_10],
  SENIOR: [GradeLevel.GRADE_11, GradeLevel.GRADE_12],
};

export interface Subject {
  id: string;
  /** Stable slug, e.g. `mathematics`. Safe to use in URLs and configuration. */
  code: string;
  name: string;
  description?: string;
  /** Icon key resolved by the design system, not a URL. */
  icon?: string;
  colour?: string;
  /** Grades for which the subject is offered. Empty means all grades. */
  grades: GradeLevel[];
  sortOrder: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  code: string;
  name: string;
  parentTopicId?: string;
}
