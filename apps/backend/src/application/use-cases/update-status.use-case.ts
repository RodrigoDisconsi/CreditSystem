import type { ApplicationStatus } from '@credit-system/shared';
import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IQueueService } from '../../domain/interfaces/queue-service.interface.js';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { QUEUE_NAMES } from '../../domain/constants/queue-names.js';
import type { UpdateStatusDto } from '../dto/update-status.dto.js';
import type { ApplicationResponseDto } from '../dto/application-response.dto.js';
import { toApplicationResponse } from '../dto/application-response.dto.js';

const TERMINAL_STATUSES: ApplicationStatus[] = ['approved', 'rejected'];

export class UpdateStatusUseCase {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly cacheService: ICacheService,
    private readonly queueService: IQueueService,
    private readonly webSocketEmitter: IWebSocketEmitter,
    private readonly encryptionService: IEncryptionService,
  ) {}

  async execute(id: string, dto: UpdateStatusDto): Promise<ApplicationResponseDto> {
    // 1. Fetch application
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundError(`Application with id '${id}' not found`);
    }

    // 2. Validate transition using entity method
    const oldStatus = application.status;
    if (!application.canTransitionTo(dto.status as ApplicationStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${oldStatus}' to '${dto.status}'`,
      );
    }

    // 3. Update via repository
    const updated = await this.applicationRepository.updateStatus(id, dto.status);

    // 4. Invalidate caches (single + list)
    await Promise.all([
      this.cacheService.del(`application:${id}`),
      this.cacheService.invalidate('applications:*'),
    ]);

    // 5. Emit WebSocket status-changed event
    this.webSocketEmitter.emitToCountry(updated.countryCode, 'application:status-changed', {
      applicationId: updated.id,
      oldStatus,
      newStatus: updated.status,
      changedAt: updated.updatedAt.toISOString(),
    });

    this.webSocketEmitter.emitToApplication(updated.id, 'application:status-changed', {
      applicationId: updated.id,
      oldStatus,
      newStatus: updated.status,
      changedAt: updated.updatedAt.toISOString(),
    });

    // 6. If terminal status (approved/rejected), enqueue notification
    if (TERMINAL_STATUSES.includes(updated.status)) {
      await this.queueService.enqueue(QUEUE_NAMES.NOTIFICATION, {
        applicationId: updated.id,
        status: updated.status,
        countryCode: updated.countryCode,
        fullName: updated.fullName,
      });
    }

    // 7. Enqueue audit event
    await this.queueService.enqueue(QUEUE_NAMES.AUDIT, {
      applicationId: updated.id,
      eventType: 'status_changed',
      payload: {
        oldStatus,
        newStatus: updated.status,
        countryCode: updated.countryCode,
      },
    });

    // 8. Return response
    return toApplicationResponse(updated, this.encryptionService);
  }
}
