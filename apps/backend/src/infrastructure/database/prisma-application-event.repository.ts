import type { PrismaClient } from '@prisma/client';
import type { IApplicationEventRepository } from '../../domain/interfaces/application-event-repository.interface.js';
import { ApplicationEvent } from '../../domain/entities/application-event.entity.js';
import { ApplicationEventMapper } from './mappers/application-event.mapper.js';

export class PrismaApplicationEventRepository implements IApplicationEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(event: ApplicationEvent): Promise<ApplicationEvent> {
    const created = await this.prisma.applicationEvent.create({
      data: {
        id: event.id,
        applicationId: event.applicationId,
        eventType: event.eventType,
        eventData: event.eventData as unknown as import('@prisma/client').Prisma.InputJsonValue,
        createdAt: event.createdAt,
      },
    });

    return ApplicationEventMapper.toDomainReconstituted(created);
  }

  async findByApplicationId(applicationId: string): Promise<ApplicationEvent[]> {
    const records = await this.prisma.applicationEvent.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => ApplicationEventMapper.toDomainReconstituted(record));
  }
}
