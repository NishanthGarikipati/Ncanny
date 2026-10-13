import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

type JsonSchema = Record<string, unknown>;

// The generator's generic signature recurses through the schema type, which
// exceeds TypeScript's instantiation depth on the larger registration schemas.
// The runtime behaviour is unaffected, so the call is made through a narrowed
// signature.
const generateJsonSchema = zodToJsonSchema as unknown as (
  schema: unknown,
  options?: unknown,
) => JsonSchema;

function toSchema(schema: ZodType<unknown>): JsonSchema {
  return generateJsonSchema(schema, { $refStrategy: 'none' });
}

/**
 * Documents a request body from its Zod schema.
 *
 * Validation lives in Zod rather than class-validator (see DL-0010), so OpenAPI
 * is generated from the same source instead of from duplicated DTO classes.
 */
export function ApiZodBody(schema: ZodType<unknown>, description?: string) {
  return ApiBody({ schema: toSchema(schema), description });
}

/** Documents query parameters from a Zod object schema. */
export function ApiZodQuery(schema: ZodType<unknown>) {
  const jsonSchema = toSchema(schema);
  const properties = (jsonSchema.properties ?? {}) as Record<string, JsonSchema>;
  const required = (jsonSchema.required ?? []) as string[];

  return applyDecorators(
    ...Object.entries(properties).map(([name, property]) =>
      ApiQuery({
        name,
        required: required.includes(name),
        schema: property,
        description: typeof property.description === 'string' ? property.description : undefined,
      }),
    ),
  );
}

/** Documents the standard failure envelope for an endpoint. */
export function ApiErrorResponse(status: number, code: string, description: string) {
  return ApiResponse({
    status,
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: code },
            message: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        requestId: { type: 'string' },
      },
    },
  });
}
