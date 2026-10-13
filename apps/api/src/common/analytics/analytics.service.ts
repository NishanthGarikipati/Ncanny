import { Injectable } from '@nestjs/common';
import type { AnalyticsEvent, AnalyticsPropertyValue } from '@ncanny/types';
import { AppLogger } from '../logging/app-logger.service';

/**
 * Single emission point for product analytics.
 *
 * Events are written to the structured log today; attaching a warehouse or
 * product-analytics vendor later is a change to this class alone. Payloads must
 * stay pseudonymous — no content bodies, no contact details (see docs/SECURITY.md).
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext('Analytics');
  }

  track(
    event: AnalyticsEvent,
    properties: Record<string, AnalyticsPropertyValue> = {},
    context: { userId?: string; requestId?: string } = {},
  ): void {
    this.logger.log('analytics_event', {
      event,
      ...context,
      properties,
    });
  }
}
