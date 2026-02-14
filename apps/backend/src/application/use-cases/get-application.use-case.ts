import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { ApplicationResponseDto } from '../dto/application-response.dto.js';
import { toApplicationResponse } from '../dto/application-response.dto.js';

const CACHE_TTL_SECONDS = 600; // 10 minutes

export class GetApplicationUseCase {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly cacheService: ICacheService,
    private readonly encryptionService: IEncryptionService,
  ) {}

  async execute(id: string): Promise<ApplicationResponseDto> {
    const cacheKey = `application:${id}`;

    const response = await this.cacheService.getOrFetch<ApplicationResponseDto>(
      cacheKey,
      async () => {
        const application = await this.applicationRepository.findById(id);
        if (!application) {
          throw new NotFoundError(`Application with id '${id}' not found`);
        }
        return toApplicationResponse(application, this.encryptionService);
      },
      CACHE_TTL_SECONDS,
    );

    return response;
  }
}
