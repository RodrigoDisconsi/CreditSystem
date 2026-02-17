import type { Job } from 'bullmq';
import { logger } from '../shared/logger.js';

export class NotificationWorker {
  async process(job: Job): Promise<void> {
    const { applicationId, status, type } = job.data as {
      applicationId: string;
      status: string;
      type?: string;
    };

    // Mock implementation - logs notification
    logger.info(`[NOTIFICATION] Application ${applicationId} -> ${status} (type: ${type || 'status_update'})`);
  }
}
