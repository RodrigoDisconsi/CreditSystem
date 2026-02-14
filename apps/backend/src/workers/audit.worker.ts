import type { Job } from 'bullmq';
import type { IApplicationEventRepository } from '../domain/interfaces/application-event-repository.interface.js';
import { ApplicationEvent } from '../domain/entities/application-event.entity.js';

export class AuditWorker {
  constructor(
    private readonly eventRepository: IApplicationEventRepository,
  ) {}

  async process(job: Job): Promise<void> {
    const { applicationId, eventType, payload } = job.data as {
      applicationId: string;
      eventType: string;
      payload: Record<string, unknown>;
    };

    const event = ApplicationEvent.create({
      applicationId,
      eventType,
      eventData: payload,
    });

    await this.eventRepository.create(event);
    console.log(`Audit event recorded: ${eventType} for application ${applicationId}`);
  }
}
