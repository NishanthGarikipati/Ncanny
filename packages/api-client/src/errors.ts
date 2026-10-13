import { ErrorCode, type ApiErrorBody, type FieldError } from '@ncanny/types';

/**
 * Normalised client-side error. Transport failures, HTTP failures and API error
 * envelopes all surface as this one type, so callers have a single thing to catch.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: FieldError[];
  readonly requestId?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: FieldError[];
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? [];
    this.requestId = params.requestId;
  }

  static fromBody(body: ApiErrorBody, status: number, requestId?: string): ApiError {
    return new ApiError({
      code: body.code,
      message: body.message,
      status,
      details: body.details,
      requestId,
    });
  }

  static network(
    message = 'Could not reach Ncanny. Check your connection and try again.',
  ): ApiError {
    return new ApiError({ code: ErrorCode.NETWORK_ERROR, message, status: 0 });
  }

  static cancelled(): ApiError {
    return new ApiError({
      code: ErrorCode.REQUEST_CANCELLED,
      message: 'Request cancelled',
      status: 0,
    });
  }

  static is(error: unknown, code: string): error is ApiError {
    return error instanceof ApiError && error.code === code;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isValidationError(): boolean {
    return this.code === ErrorCode.VALIDATION_ERROR;
  }

  /** Field errors indexed by field name, for binding straight into form state. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details) {
      if (!(detail.field in map)) {
        map[detail.field] = detail.message;
      }
    }
    return map;
  }
}
