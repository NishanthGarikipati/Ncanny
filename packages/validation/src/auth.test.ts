import { GradeLevel } from '@ncanny/types';
import {
  loginSchema,
  otpVerifySchema,
  registerPreceptorSchema,
  registerScholarSchema,
} from './auth';
import { passwordSchema, phoneSchema } from './common';
import { toFieldErrorMap, validate } from './format';

const objectId = (seed: string) => seed.padEnd(24, '0').slice(0, 24);

const validScholar = {
  fullName: 'Aarav Mehta',
  grade: GradeLevel.GRADE_7,
  subjectIds: [objectId('aaaaaaaaaaaa')],
  interestedSubjectIds: [],
  email: 'Aarav.Mehta@example.com',
  phone: '+14155550123',
  password: 'StrongPass1',
  confirmPassword: 'StrongPass1',
  schoolName: 'Ncanny School',
  schoolAddress: {
    line1: '123 Mystic Lane',
    city: 'Enchanted City',
    country: 'India',
  },
};

const validPreceptor = {
  fullName: 'Priya Nair',
  preceptorRole: 'Senior Science Preceptor',
  teachingSubjectIds: [objectId('bbbbbbbbbbbb')],
  knowledgeAreas: ['Astronomy'],
  email: 'priya@example.com',
  phone: '+14155550124',
  password: 'StrongPass1',
  confirmPassword: 'StrongPass1',
  schoolId: objectId('cccccccccccc'),
};

describe('passwordSchema', () => {
  it.each([
    ['Short1A', 'shorter than the minimum length'],
    ['alllowercase1', 'missing an uppercase letter'],
    ['ALLUPPERCASE1', 'missing a lowercase letter'],
    ['NoDigitsHere', 'missing a number'],
  ])('rejects %s (%s)', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });

  it('accepts a compliant password', () => {
    expect(passwordSchema.safeParse('StrongPass1').success).toBe(true);
  });
});

describe('phoneSchema', () => {
  it('accepts an E.164 number', () => {
    expect(phoneSchema.safeParse('+14155550123').success).toBe(true);
  });

  it.each(['14155550123', '+0415555012', '+1 415 555 0123', '+1415555012345678'])(
    'rejects %s',
    (phone) => {
      expect(phoneSchema.safeParse(phone).success).toBe(false);
    },
  );
});

describe('registerScholarSchema', () => {
  it('accepts a valid registration and normalises the email', () => {
    const result = registerScholarSchema.safeParse(validScholar);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('aarav.mehta@example.com');
    }
  });

  it('rejects mismatched password confirmation against the confirmPassword field', () => {
    const result = registerScholarSchema.safeParse({
      ...validScholar,
      confirmPassword: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrorMap(result.error).confirmPassword).toBe('Passwords do not match');
    }
  });

  it('requires at least one subject of study', () => {
    const result = registerScholarSchema.safeParse({ ...validScholar, subjectIds: [] });
    expect(result.success).toBe(false);
  });

  it('requires either a school id or a school name with address', () => {
    const { schoolName: _name, schoolAddress: _address, ...withoutSchool } = validScholar;
    const result = registerScholarSchema.safeParse(withoutSchool);
    expect(result.success).toBe(false);
  });

  it('accepts a school referenced by id alone', () => {
    const { schoolName: _name, schoolAddress: _address, ...rest } = validScholar;
    const result = registerScholarSchema.safeParse({ ...rest, schoolId: objectId('dddddddddddd') });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid grade', () => {
    const result = registerScholarSchema.safeParse({ ...validScholar, grade: 'GRADE_14' });
    expect(result.success).toBe(false);
  });
});

describe('registerPreceptorSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerPreceptorSchema.safeParse(validPreceptor).success).toBe(true);
  });

  it('requires at least one teaching subject', () => {
    const result = registerPreceptorSchema.safeParse({
      ...validPreceptor,
      teachingSubjectIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('does not apply the registration password policy to sign-in', () => {
    const result = loginSchema.safeParse({ email: 'a@example.com', password: 'legacy' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com', password: '' }).success).toBe(false);
  });
});

describe('otpVerifySchema', () => {
  it('requires exactly six digits', () => {
    expect(otpVerifySchema.safeParse({ phone: '+14155550123', code: '123456' }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ phone: '+14155550123', code: '12345' }).success).toBe(false);
    expect(otpVerifySchema.safeParse({ phone: '+14155550123', code: 'abcdef' }).success).toBe(
      false,
    );
  });
});

describe('validate helper', () => {
  it('returns typed data on success', () => {
    const outcome = validate(loginSchema, { email: 'a@example.com', password: 'secret' });
    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.data.email).toBe('a@example.com');
    }
  });

  it('returns both a list and a map of errors on failure', () => {
    const outcome = validate(loginSchema, { email: 'not-an-email', password: '' });
    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.errors.length).toBeGreaterThan(0);
      expect(outcome.errorMap.email).toBeDefined();
      expect(outcome.errorMap.password).toBeDefined();
    }
  });
});
