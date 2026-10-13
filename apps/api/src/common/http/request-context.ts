import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AccessTokenClaims } from '@ncanny/types';

/** Request augmented with the per-request context the API relies on. */
export interface NcannyRequest extends Request {
  requestId: string;
  user?: AccessTokenClaims;
}

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a request id, honouring one supplied upstream so that a trace spans
 * the load balancer, the web app's server-side fetches and the API.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const supplied = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();

  (req as NcannyRequest).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function getRequestId(request: unknown): string {
  const candidate = (request as Partial<NcannyRequest> | undefined)?.requestId;
  return typeof candidate === 'string' ? candidate : 'unknown';
}

export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim();
  }
  return request.ip;
}

export function getUserAgent(request: Request): string | undefined {
  const agent = request.headers['user-agent'];
  return typeof agent === 'string' ? agent.slice(0, 300) : undefined;
}
