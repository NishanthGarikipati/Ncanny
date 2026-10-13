import { ApiError } from '@ncanny/api-client';
import { ErrorCode } from '@ncanny/types';
import { loginSchema } from '@ncanny/validation';
import { resolveApiUrl } from './api-url';
import { FORM_ERROR, parseForm, toFormErrors } from './form';
import { assembleTokens } from './stored-tokens';
import { channelColor } from '../theme/colors';

describe('assembleTokens', () => {
  it('rebuilds a bearer pair from the three stored values', () => {
    expect(assembleTokens('access', 'refresh', '900')).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
      tokenType: 'Bearer',
    });
  });

  it('returns null when either token is missing, so a partial write cannot authenticate', () => {
    expect(assembleTokens('access', null, '900')).toBeNull();
    expect(assembleTokens(null, 'refresh', '900')).toBeNull();
  });

  it('treats a corrupt expiry as zero rather than throwing', () => {
    expect(assembleTokens('access', 'refresh', 'nope')?.expiresIn).toBe(0);
  });
});

describe('resolveApiUrl', () => {
  it('accepts an absolute http(s) URL and strips a trailing slash', () => {
    expect(resolveApiUrl('https://api.ncanny.test/')).toBe('https://api.ncanny.test');
  });

  it('falls back when the configured value is missing or not a URL', () => {
    expect(resolveApiUrl(undefined)).toBe('http://localhost:4000');
    expect(resolveApiUrl('/api')).toBe('http://localhost:4000');
    expect(resolveApiUrl('javascript:alert(1)')).toBe('http://localhost:4000');
  });
});

describe('parseForm', () => {
  it('normalises email case and rejects an empty password', () => {
    expect(parseForm(loginSchema, { email: 'A@Example.com', password: 'secret' })).toEqual({
      ok: true,
      data: { email: 'a@example.com', password: 'secret' },
    });

    const rejected = parseForm(loginSchema, { email: 'nope', password: '' });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) throw new Error('expected failure');
    expect(rejected.errors.email).toMatch(/valid email/i);
  });
});

describe('toFormErrors', () => {
  it('never surfaces an unknown error verbatim', () => {
    expect(toFormErrors(new Error('mongo connection string leaked'))).toEqual({
      [FORM_ERROR]: 'Something went wrong. Please try again.',
    });
  });

  it('keeps a safe API message when there are no field errors', () => {
    expect(
      toFormErrors(
        new ApiError({
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Email or password is incorrect',
          status: 401,
        }),
      ),
    ).toEqual({ [FORM_ERROR]: 'Email or password is incorrect' });
  });
});

describe('channelColor', () => {
  it('renders a token triple as an rgb colour the two platforms share', () => {
    expect(channelColor('14 116 144')).toBe('rgb(14, 116, 144)');
  });
});
