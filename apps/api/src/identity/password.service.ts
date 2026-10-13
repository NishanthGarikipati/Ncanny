import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service';

/**
 * Sole owner of password hashing (see DL-0009).
 *
 * Keeping the algorithm behind one service means a future move to Argon2id can
 * rehash transparently on next successful sign-in, with no forced resets.
 */
@Injectable()
export class PasswordService {
  constructor(private readonly config: AppConfigService) {}

  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.config.bcryptRounds);
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainText, hash);
    } catch {
      return false;
    }
  }

  /**
   * Burns roughly the same time as a real verification.
   *
   * Called when an email is not registered, so that response timing cannot be
   * used to discover which accounts exist.
   */
  async burnTimingBudget(): Promise<void> {
    await bcrypt.compare(
      'timing-equalisation-placeholder',
      '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7cLLIvYOnK1LwG2U0xhZWjT8Y.1b1Rm',
    );
  }
}
