import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics/analytics.service';
import { CacheService } from './cache/cache.service';
import { AppLogger } from './logging/app-logger.service';

/** Cross-cutting services available to every module without repeated imports. */
@Global()
@Module({
  providers: [AppLogger, CacheService, AnalyticsService],
  exports: [AppLogger, CacheService, AnalyticsService],
})
export class CommonModule {}
