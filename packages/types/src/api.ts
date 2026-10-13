import type { ApiErrorBody } from './errors';

/** Successful response envelope. Every endpoint returns data inside this shape. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

/** Failure response envelope. Stack traces are never included. */
export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

/** Cursor pagination request. Offset pagination is deliberately not offered: it does not scale. */
export interface PaginationQuery {
  /** Opaque cursor returned by a previous page. */
  cursor?: string;
  /** Items per page. Servers clamp this to a maximum. */
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  /** Only present where counting is cheap and useful. */
  total?: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
