import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../common/logging/app-logger.service';

export const OTP_DELIVERY_PROVIDER = Symbol('OTP_DELIVERY_PROVIDER');

/**
 * Delivery channel for one-time codes.
 *
 * An SMS vendor is bound to this interface in a later phase; nothing in the
 * authentication flow changes when it is (see DL-0004).
 */
export interface OtpDeliveryProvider {
  send(phone: string, code: string): Promise<void>;
}

/**
 * Development/test implementation.
 *
 * It records that a code was sent but never the code itself: logging a live
 * credential would defeat the purpose of hashing it in the database.
 */
@Injectable()
export class LoggingOtpDeliveryProvider implements OtpDeliveryProvider {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext('OtpDelivery');
  }

  async send(phone: string): Promise<void> {
    this.logger.log('One-time code dispatched', { phone: maskPhone(phone) });
  }
}

/** Keeps the country code and last two digits, enough to support a user without exposing the number. */
export function maskPhone(phone: string): string {
  if (phone.length <= 5) {
    return '***';
  }
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 5)}${phone.slice(-2)}`;
}
