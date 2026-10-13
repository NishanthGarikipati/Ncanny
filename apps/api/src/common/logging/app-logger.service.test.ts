import { redact } from './app-logger.service';

describe('log redaction', () => {
  it('removes credentials at the top level', () => {
    expect(
      redact({ email: 'a@example.com', password: 'StrongPass1', refreshToken: 'abc.def' }),
    ).toEqual({
      email: 'a@example.com',
      password: '[REDACTED]',
      refreshToken: '[REDACTED]',
    });
  });

  it('removes credentials nested inside objects and arrays', () => {
    const redacted = redact({
      request: { body: { confirmPassword: 'StrongPass1' } },
      sessions: [{ accessToken: 'token-1' }, { accessToken: 'token-2' }],
    }) as Record<string, any>;

    expect(redacted.request.body.confirmPassword).toBe('[REDACTED]');
    expect(redacted.sessions[0].accessToken).toBe('[REDACTED]');
    expect(redacted.sessions[1].accessToken).toBe('[REDACTED]');
  });

  it('matches key names irrespective of case', () => {
    expect(redact({ Authorization: 'Bearer abc', OTP: '123456' })).toEqual({
      Authorization: '[REDACTED]',
      OTP: '[REDACTED]',
    });
  });

  it('leaves non-sensitive values untouched', () => {
    const input = { cannyId: 'NCS-123456', count: 3, active: true, missing: null };
    expect(redact(input)).toEqual(input);
  });

  it('stops recursing on deeply nested structures rather than overflowing', () => {
    let deep: Record<string, unknown> = { password: 'StrongPass1' };
    for (let depth = 0; depth < 20; depth += 1) {
      deep = { nested: deep };
    }
    expect(() => redact(deep)).not.toThrow();
  });
});
