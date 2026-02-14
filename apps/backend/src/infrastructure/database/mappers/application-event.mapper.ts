import type { ApplicationEvent as PrismaApplicationEvent } from '@prisma/client';
import { ApplicationEvent } from '../../../domain/entities/application-event.entity.js';

export class ApplicationEventMapper {
  static toDomain(prismaEvent: PrismaApplicationEvent): ApplicationEvent {
    return ApplicationEvent.create({
      applicationId: prismaEvent.applicationId,
      eventType: prismaEvent.eventType,
      eventData: (prismaEvent.eventData as Record<string, unknown>) ?? {},
    });
  }

  static toDomainReconstituted(prismaEvent: PrismaApplicationEvent): ApplicationEvent {
    // Since ApplicationEvent only has create(), we reconstruct it manually.
    // The domain entity uses Object.freeze on eventData and generates a new id + createdAt,
    // but for reconstitution from DB we need to preserve the original values.
    // We use create() but note this generates a new id - for read operations this is acceptable
    // as events are immutable and identified by DB id in persistence.
    return Object.assign(
      Object.create(ApplicationEvent.prototype),
      {
        id: prismaEvent.id,
        applicationId: prismaEvent.applicationId,
        eventType: prismaEvent.eventType,
        eventData: Object.freeze({ ...(prismaEvent.eventData as Record<string, unknown> ?? {}) }),
        createdAt: prismaEvent.createdAt,
      },
    ) as ApplicationEvent;
  }
}
