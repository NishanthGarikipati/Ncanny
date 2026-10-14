import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/http/response-envelope.interceptor';
import { requestIdMiddleware } from './common/http/request-context';
import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SchoolsModule } from './schools/schools.module';
import { ContentModule } from './content/content.module';
import { SubjectsModule } from './subjects/subjects.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    AuditModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [{ ttl: config.rateLimitTtlSeconds * 1000, limit: config.rateLimitLimit }],
        // Rate limiting is disabled only by the test harness, which otherwise
        // would throttle itself while exercising the authentication endpoints.
        // Configuration validation forbids disabling it in production.
        skipIf: () => !config.rateLimitEnabled,
      }),
    }),
    IdentityModule,
    SchoolsModule,
    SubjectsModule,
    ProfilesModule,
    ContentModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*');
  }
}
