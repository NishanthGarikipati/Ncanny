import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { AuthSession } from '@ncanny/types';

export const api = (app: INestApplication) => request(app.getHttpServer());

let sequence = 0;
const nextSuffix = () => {
  sequence += 1;
  return sequence;
};

/**
 * Names are validated as names, so fixtures cannot number them. This renders a
 * counter as letters ("a", "b", ... "aa") to keep generated names unique and valid.
 */
const letters = (value: number): string => {
  let remaining = value;
  let output = '';
  while (remaining > 0) {
    remaining -= 1;
    output = String.fromCharCode(97 + (remaining % 26)) + output;
    remaining = Math.floor(remaining / 26);
  }
  return output || 'a';
};

export interface ScholarFixtureOverrides {
  email?: string;
  phone?: string;
  password?: string;
  fullName?: string;
  grade?: string;
  subjectIds?: string[];
  schoolId?: string;
  schoolName?: string;
}

export const scholarPayload = (
  subjectIds: string[],
  overrides: ScholarFixtureOverrides = {},
): Record<string, unknown> => {
  const suffix = nextSuffix();
  const base = {
    fullName: overrides.fullName ?? `Scholar ${letters(suffix)}`,
    grade: overrides.grade ?? 'GRADE_7',
    subjectIds: overrides.subjectIds ?? subjectIds.slice(0, 2),
    interestedSubjectIds: [],
    email: overrides.email ?? `scholar${suffix}@example.com`,
    phone: overrides.phone ?? `+1415555${String(1000 + suffix).padStart(4, '0')}`,
    password: overrides.password ?? 'StrongPass1',
    confirmPassword: overrides.password ?? 'StrongPass1',
  };

  if (overrides.schoolId) {
    return { ...base, schoolId: overrides.schoolId };
  }

  return {
    ...base,
    schoolName: overrides.schoolName ?? 'Ncanny School',
    schoolAddress: {
      line1: '123 Mystic Lane',
      city: 'Enchanted City',
      country: 'India',
    },
  };
};

export const preceptorPayload = (
  subjectIds: string[],
  overrides: ScholarFixtureOverrides = {},
): Record<string, unknown> => {
  const suffix = nextSuffix();
  const base = {
    fullName: overrides.fullName ?? `Preceptor ${letters(suffix)}`,
    preceptorRole: 'Senior Science Preceptor',
    teachingSubjectIds: overrides.subjectIds ?? subjectIds.slice(0, 1),
    knowledgeAreas: ['Astronomy'],
    yearsOfExperience: 8,
    email: overrides.email ?? `preceptor${suffix}@example.com`,
    phone: overrides.phone ?? `+1415666${String(1000 + suffix).padStart(4, '0')}`,
    password: overrides.password ?? 'StrongPass1',
    confirmPassword: overrides.password ?? 'StrongPass1',
  };

  if (overrides.schoolId) {
    return { ...base, schoolId: overrides.schoolId };
  }

  return {
    ...base,
    schoolName: overrides.schoolName ?? 'Ncanny School',
    schoolAddress: {
      line1: '123 Mystic Lane',
      city: 'Enchanted City',
      country: 'India',
    },
  };
};

export async function registerScholar(
  app: INestApplication,
  subjectIds: string[],
  overrides: ScholarFixtureOverrides = {},
): Promise<AuthSession> {
  const response = await api(app)
    .post('/api/v1/auth/register/scholar')
    .send(scholarPayload(subjectIds, overrides))
    .expect(201);
  return response.body.data as AuthSession;
}

export async function registerPreceptor(
  app: INestApplication,
  subjectIds: string[],
  overrides: ScholarFixtureOverrides = {},
): Promise<AuthSession> {
  const response = await api(app)
    .post('/api/v1/auth/register/preceptor')
    .send(preceptorPayload(subjectIds, overrides))
    .expect(201);
  return response.body.data as AuthSession;
}

export const bearer = (session: AuthSession) => `Bearer ${session.tokens.accessToken}`;
