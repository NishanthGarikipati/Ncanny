import { GradeLevel, type GradeLevel as GradeLevelType } from '@ncanny/types';

export interface SubjectSeed {
  code: string;
  name: string;
  description: string;
  icon: string;
  colour: string;
  grades: GradeLevelType[];
  sortOrder: number;
}

const ALL_GRADES: GradeLevelType[] = [];

const SECONDARY_AND_ABOVE: GradeLevelType[] = [
  GradeLevel.GRADE_9,
  GradeLevel.GRADE_10,
  GradeLevel.GRADE_11,
  GradeLevel.GRADE_12,
];

/**
 * Baseline curriculum shipped with the platform. Schools extend this later;
 * these entries exist so registration, profiles and subject networking work on
 * a fresh installation.
 */
export const SUBJECT_CATALOGUE: SubjectSeed[] = [
  {
    code: 'mathematics',
    name: 'Mathematics',
    description: 'Numbers, patterns, reasoning and problem solving.',
    icon: 'sigma',
    colour: '#3B82F6',
    grades: ALL_GRADES,
    sortOrder: 10,
  },
  {
    code: 'science',
    name: 'Science',
    description: 'Observation, experiment and explanation of the natural world.',
    icon: 'flask',
    colour: '#10B981',
    grades: ALL_GRADES,
    sortOrder: 20,
  },
  {
    code: 'english',
    name: 'English',
    description: 'Reading, writing, speaking and listening.',
    icon: 'book-open',
    colour: '#8B5CF6',
    grades: ALL_GRADES,
    sortOrder: 30,
  },
  {
    code: 'social-studies',
    name: 'Social Studies',
    description: 'History, geography, civics and society.',
    icon: 'globe',
    colour: '#F59E0B',
    grades: ALL_GRADES,
    sortOrder: 40,
  },
  {
    code: 'computer-science',
    name: 'Computer Science',
    description: 'Computational thinking, programming and digital literacy.',
    icon: 'cpu',
    colour: '#06B6D4',
    grades: ALL_GRADES,
    sortOrder: 50,
  },
  {
    code: 'art',
    name: 'Art',
    description: 'Drawing, painting, design and visual expression.',
    icon: 'palette',
    colour: '#EC4899',
    grades: ALL_GRADES,
    sortOrder: 60,
  },
  {
    code: 'music',
    name: 'Music',
    description: 'Performance, composition and appreciation.',
    icon: 'music',
    colour: '#A855F7',
    grades: ALL_GRADES,
    sortOrder: 70,
  },
  {
    code: 'physical-education',
    name: 'Physical Education',
    description: 'Movement, sport, health and wellbeing.',
    icon: 'activity',
    colour: '#EF4444',
    grades: ALL_GRADES,
    sortOrder: 80,
  },
  {
    code: 'languages',
    name: 'Languages',
    description: 'Additional and regional languages.',
    icon: 'languages',
    colour: '#14B8A6',
    grades: ALL_GRADES,
    sortOrder: 90,
  },
  {
    code: 'environmental-studies',
    name: 'Environmental Studies',
    description: 'Ecology, sustainability and the environment.',
    icon: 'leaf',
    colour: '#22C55E',
    grades: ALL_GRADES,
    sortOrder: 100,
  },
  {
    code: 'physics',
    name: 'Physics',
    description: 'Matter, energy, motion and force.',
    icon: 'atom',
    colour: '#6366F1',
    grades: SECONDARY_AND_ABOVE,
    sortOrder: 110,
  },
  {
    code: 'chemistry',
    name: 'Chemistry',
    description: 'Substances, reactions and their properties.',
    icon: 'test-tube',
    colour: '#0EA5E9',
    grades: SECONDARY_AND_ABOVE,
    sortOrder: 120,
  },
  {
    code: 'biology',
    name: 'Biology',
    description: 'Living organisms and life processes.',
    icon: 'dna',
    colour: '#84CC16',
    grades: SECONDARY_AND_ABOVE,
    sortOrder: 130,
  },
  {
    code: 'economics',
    name: 'Economics',
    description: 'Resources, markets and decision making.',
    icon: 'trending-up',
    colour: '#F97316',
    grades: SECONDARY_AND_ABOVE,
    sortOrder: 140,
  },
  {
    code: 'business-studies',
    name: 'Business Studies',
    description: 'Enterprise, organisations and commerce.',
    icon: 'briefcase',
    colour: '#D946EF',
    grades: SECONDARY_AND_ABOVE,
    sortOrder: 150,
  },
];
