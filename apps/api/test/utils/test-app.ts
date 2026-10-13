import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { AppLogger } from '../../src/common/logging/app-logger.service';
import { SubjectsService } from '../../src/subjects/subjects.service';

export interface TestHarness {
  app: INestApplication;
  close: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  seedSubjects: () => Promise<string[]>;
}

export interface HarnessOptions {
  /** Rate limiting is off by default so ordinary tests are not throttled. */
  enableRateLimit?: boolean;
  env?: Record<string, string>;
}

/**
 * Boots the real application against an in-memory MongoDB (see DL-0006).
 *
 * The whole stack is exercised — middleware, global guards, pipes, interceptor
 * and exception filter — because authorisation and visibility bugs usually live
 * in that wiring rather than in the services themselves.
 */
export async function createTestHarness(options: HarnessOptions = {}): Promise<TestHarness> {
  const mongo = await MongoMemoryServer.create();

  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: mongo.getUri(),
    MONGODB_DB_NAME: `ncanny_test_${Date.now()}`,
    JWT_SECRET: 'test-secret-value-that-is-long-enough',
    JWT_ACCESS_TTL_SECONDS: '900',
    JWT_REFRESH_TTL_SECONDS: '3600',
    BCRYPT_ROUNDS: '10',
    OTP_TTL_SECONDS: '300',
    OTP_MAX_ATTEMPTS: '3',
    OTP_EXPOSE_DEBUG_CODE: 'true',
    RATE_LIMIT_ENABLED: options.enableRateLimit ? 'true' : 'false',
    LOG_LEVEL: 'error',
    SWAGGER_ENABLED: 'false',
    ...options.env,
  });

  AppLogger.configure('error', true);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  await app.init();

  const subjectsService = app.get(SubjectsService);
  // The application's own connection, not the global mongoose default: NestJS
  // creates its own, and clearing the wrong one silently leaves data behind.
  const connection = app.get<Connection>(getConnectionToken());

  return {
    app,
    close: async () => {
      await app.close();
      await mongo.stop();
    },
    resetDatabase: async () => {
      const collections = await connection.db?.collections();
      await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
    },
    seedSubjects: async () => {
      await subjectsService.seed();
      const subjects = await subjectsService.list();
      return subjects.map((subject) => subject.id);
    },
  };
}
