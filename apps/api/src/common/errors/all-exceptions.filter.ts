import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { Error as MongooseError, mongo } from 'mongoose';
import { ErrorCode, type ApiFailure, type FieldError } from '@ncanny/types';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../logging/app-logger.service';
import { getRequestId } from '../http/request-context';
import { AppException } from './app.exception';

interface NormalisedError {
  status: number;
  code: string;
  message: string;
  details?: FieldError[];
}

/**
 * Converts every thrown value into the standard failure envelope.
 *
 * Internal detail (stack traces, driver messages, duplicate-key specifics) is
 * logged but never returned, so a failure cannot leak schema or infrastructure
 * information to a client.
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse<Response>();
    const requestId = getRequestId(request);

    const normalised = this.normalise(exception);

    const logPayload = {
      requestId,
      method: request?.method,
      path: request?.originalUrl ?? request?.url,
      status: normalised.status,
      code: normalised.code,
      userId: request?.user?.sub,
    };

    if (normalised.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        normalised.message,
        exception instanceof Error ? exception.stack : undefined,
        logPayload,
      );
    } else {
      this.logger.warn(normalised.message, logPayload);
    }

    const body: ApiFailure = {
      success: false,
      error: {
        code: normalised.code,
        message: this.publicMessage(normalised),
        ...(normalised.details ? { details: normalised.details } : {}),
      },
      requestId,
    };

    response.status(normalised.status).json(body);
  }

  /** Server errors are reported generically in production; clients get the request id instead. */
  private publicMessage(error: NormalisedError): string {
    if (error.status >= HttpStatus.INTERNAL_SERVER_ERROR && this.config.isProduction) {
      return 'Something went wrong. Please try again.';
    }
    return error.message;
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many requests. Please wait a moment and try again.',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const fromPayload =
        typeof payload === 'object' && payload !== null
          ? (payload as { code?: string; message?: string | string[]; details?: FieldError[] })
          : undefined;

      const message = Array.isArray(fromPayload?.message)
        ? fromPayload.message.join(', ')
        : (fromPayload?.message ?? exception.message);

      return {
        status,
        code: fromPayload?.code ?? this.codeForStatus(status),
        message,
        details: fromPayload?.details,
      };
    }

    if (exception instanceof mongo.MongoServerError && exception.code === 11000) {
      // The specific duplicated field is intentionally not disclosed: it would
      // allow enumeration of registered emails and phone numbers.
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: 'That record already exists.',
      };
    }

    if (exception instanceof MongooseError.CastError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.BAD_REQUEST,
        message: 'Invalid identifier.',
      };
    }

    if (exception instanceof MongooseError.ValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed.',
        details: Object.entries(exception.errors).map(([field, error]) => ({
          field,
          message: error.message,
        })),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: exception instanceof Error ? exception.message : 'Unexpected error',
    };
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
