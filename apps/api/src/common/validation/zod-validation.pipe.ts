import { Injectable, type PipeTransform } from '@nestjs/common';
import { toFieldErrors } from '@ncanny/validation';
import { ZodError, type ZodType } from 'zod';
import { AppException } from '../errors/app.exception';

/**
 * Validates and transforms a payload with the shared Zod schema.
 *
 * Using the same schema the clients use means server rejections and client-side
 * form errors always agree, and unknown fields are stripped rather than trusted.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw AppException.validation(
          'Some of the details provided are not valid.',
          toFieldErrors(error),
        );
      }
      throw error;
    }
  }
}

/** Convenience factory: `@Body(zodBody(loginSchema))`. */
export const zodBody = <T>(schema: ZodType<T>) => new ZodValidationPipe(schema);

/** Convenience factory for query strings: `@Query(zodQuery(paginationSchema))`. */
export const zodQuery = <T>(schema: ZodType<T>) => new ZodValidationPipe(schema);

/** Convenience factory for route parameters: `@Param(zodParam(cannyIdParamSchema))`. */
export const zodParam = <T>(schema: ZodType<T>) => new ZodValidationPipe(schema);
