import type { PaginatedResponse } from '@credit-system/shared';
import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import type { ListApplicationsDto } from '../dto/list-applications.dto.js';
import type { ApplicationResponseDto } from '../dto/application-response.dto.js';
import { toApplicationResponse } from '../dto/application-response.dto.js';

const CACHE_TTL_SECONDS = 300; // 5 minutes

export class ListApplicationsUseCase {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly cacheService: ICacheService,
    private readonly encryptionService: IEncryptionService,
  ) {}

  async execute(dto: ListApplicationsDto): Promise<PaginatedResponse<ApplicationResponseDto>> {
    const cacheKey = `applications:${dto.country || 'all'}:${dto.status || 'all'}:${dto.page}:${dto.limit}`;

    const response = await this.cacheService.getOrFetch<PaginatedResponse<ApplicationResponseDto>>(
      cacheKey,
      async () => {
        const { applications, total } = await this.applicationRepository.findByFilters({
          country: dto.country,
          status: dto.status,
          page: dto.page,
          limit: dto.limit,
        });

        const data = applications.map((app) =>
          toApplicationResponse(app, this.encryptionService),
        );

        const totalPages = Math.ceil(total / dto.limit);

        return {
          success: true,
          data,
          pagination: {
            page: dto.page,
            limit: dto.limit,
            total,
            totalPages,
          },
        };
      },
      CACHE_TTL_SECONDS,
    );

    return response;
  }
}
