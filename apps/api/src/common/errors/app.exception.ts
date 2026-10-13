import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, type FieldError } from '@ncanny/types';

/**
 * Domain error carrying a stable machine-readable code.
 *
 * Throwing this (rather than a bare HttpException) guarantees the client
 * receives a code it can branch on, and keeps HTTP status selection in one place.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode | string;
  readonly details?: FieldError[];

  constructor(
    code: ErrorCode | string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: FieldError[],
  ) {
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code: ErrorCode | string = ErrorCode.BAD_REQUEST) {
    return new AppException(code, message, HttpStatus.BAD_REQUEST);
  }

  static validation(message: string, details: FieldError[]) {
    return new AppException(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }

  static unauthenticated(
    message = 'Authentication is required',
    code: ErrorCode | string = ErrorCode.UNAUTHENTICATED,
  ) {
    return new AppException(code, message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(
    message = 'You do not have access to this resource',
    code: ErrorCode | string = ErrorCode.FORBIDDEN,
  ) {
    return new AppException(code, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message: string, code: ErrorCode | string = ErrorCode.NOT_FOUND) {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string, code: ErrorCode | string = ErrorCode.CONFLICT) {
    return new AppException(code, message, HttpStatus.CONFLICT);
  }

  static internal(message = 'Something went wrong') {
    return new AppException(ErrorCode.INTERNAL_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
