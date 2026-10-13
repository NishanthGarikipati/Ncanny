import { ApiError } from '@ncanny/api-client';
import { ErrorCode } from '@ncanny/types';
import { loginSchema } from '@ncanny/validation';
import { FORM_ERROR, parseForm, toFormErrors } from './form';

describe('parseForm', () => {
  it('returns parsed data for valid input', () => {
    const result = parseForm(loginSchema, { email: 'A@Example.com', password: 'secret' });
    expect(result).toEqual({ ok: true, data: { email: 'a@example.com', password: 'secret' } });
  });

  it('maps each invalid field to a single message', () => {
    const result = parseForm(loginSchema, { email: 'nope', password: '' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.errors.email).toMatch(/valid email/i);
    expect(result.errors.password).toMatch(/enter your password/i);
  });
});

describe('toFormErrors', () => {
  it('uses server field errors when the API supplies them', () => {
    const error = new ApiError({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      status: 400,
      details: [{ field: 'email', message: 'That email is already registered' }],
    });

    expect(toFormErrors(error)).toEqual({ email: 'That email is already registered' });
  });

  it('falls back to a form-level message for errors without field detail', () => {
    const error = new ApiError({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Email or password is incorrect',
      status: 401,
    });

    expect(toFormErrors(error)).toEqual({ [FORM_ERROR]: 'Email or password is incorrect' });
  });

  it('never surfaces an unknown error verbatim', () => {
    expect(toFormErrors(new Error('mongo: connection refused at 10.0.0.4'))).toEqual({
      [FORM_ERROR]: 'Something went wrong. Please try again.',
    });
  });
});
