import type { Job } from 'bullmq';

export class NotificationWorker {
  async process(job: Job): Promise<void> {
    const { applicationId, status, type } = job.data as {
      applicationId: string;
      status: string;
      type?: string;
    };

    // Mock implementation - logs notification
    console.log(`[NOTIFICATION] Application ${applicationId} -> ${status}`);
    console.log(`  Type: ${type || 'status_update'}`);
    console.log(`  Would send email/SMS notification here`);
  }
}
