import { Injectable, Scope, type LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Keys whose values must never reach a log sink. Matching is case-insensitive
 * and applies at any depth of a logged object.
 */
const REDACTED_KEYS = new Set(
  [
    'password',
    'confirmpassword',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'refreshtokenhash',
    'otp',
    'code',
    'codehash',
    'authorization',
    'cookie',
    'secret',
    'jwtsecret',
  ].map((key) => key.toLowerCase()),
);

const REDACTED = '[REDACTED]';

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1));
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : redact(entry, depth + 1);
  }
  return output;
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Structured JSON logger. One line per event keeps logs parseable by CloudWatch
 * and any OpenTelemetry collector without a transformation step.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;
  private static minimumLevel: LogLevel = 'info';
  private static silent = false;

  static configure(level: LogLevel, silent = false): void {
    AppLogger.minimumLevel = level;
    AppLogger.silent = silent;
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: unknown, context?: LogContext | string): void {
    this.write('info', message, context);
  }

  debug(message: unknown, context?: LogContext | string): void {
    this.write('debug', message, context);
  }

  warn(message: unknown, context?: LogContext | string): void {
    this.write('warn', message, context);
  }

  error(message: unknown, trace?: string, context?: LogContext | string): void {
    this.write('error', message, context, trace);
  }

  verbose(message: unknown, context?: LogContext | string): void {
    this.write('debug', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: LogContext | string,
    trace?: string,
  ): void {
    if (AppLogger.silent || LEVEL_ORDER[level] < LEVEL_ORDER[AppLogger.minimumLevel]) {
      return;
    }

    const extra = typeof context === 'string' ? { context } : (context ?? {});
    const entry = {
      level,
      time: new Date().toISOString(),
      context: this.context,
      message: typeof message === 'string' ? message : redact(message),
      ...(redact(extra) as Record<string, unknown>),
      ...(trace ? { trace } : {}),
    };

    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }
}
