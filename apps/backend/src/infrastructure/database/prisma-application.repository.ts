import type { PrismaClient } from '@prisma/client';
import type { ApplicationFilters } from '@credit-system/shared';
import { PAGINATION_DEFAULTS } from '@credit-system/shared';
import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import { Application } from '../../domain/entities/application.entity.js';
import { ApplicationMapper } from './mappers/application.mapper.js';
import { NotFoundError } from '../../shared/errors/index.js';

export class PrismaApplicationRepository implements IApplicationRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryptionService: IEncryptionService,
  ) {}

  private toDomainDecrypted(record: import('@prisma/client').Application): Application {
    const domainEntity = ApplicationMapper.toDomain(record);
    const decryptedDocumentId = this.encryptionService.decrypt(record.documentId);
    return Application.reconstitute({
      id: domainEntity.id,
      countryCode: domainEntity.countryCode,
      fullName: domainEntity.fullName,
      documentId: decryptedDocumentId,
      requestedAmount: domainEntity.requestedAmount,
      monthlyIncome: domainEntity.monthlyIncome,
      status: domainEntity.status,
      bankData: domainEntity.bankData,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    });
  }

  async create(application: Application): Promise<Application> {
    const encryptedDocumentId = this.encryptionService.encrypt(application.documentId);

    const createData = ApplicationMapper.toPrismaCreate(application);
    createData.documentId = encryptedDocumentId;

    const created = await this.prisma.application.create({
      data: createData,
    });

    // Return domain entity with original (decrypted) documentId
    const domainEntity = ApplicationMapper.toDomain(created);
    return Application.reconstitute({
      id: domainEntity.id,
      countryCode: domainEntity.countryCode,
      fullName: domainEntity.fullName,
      documentId: application.documentId,
      requestedAmount: domainEntity.requestedAmount,
      monthlyIncome: domainEntity.monthlyIncome,
      status: domainEntity.status,
      bankData: domainEntity.bankData,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    });
  }

  async findById(id: string): Promise<Application | null> {
    const record = await this.prisma.application.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomainDecrypted(record);
  }

  async findByFilters(filters: ApplicationFilters): Promise<{ applications: Application[]; total: number }> {
    const page = filters.page ?? PAGINATION_DEFAULTS.page;
    const limit = Math.min(filters.limit ?? PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.country) {
      where.countryCode = filters.country;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const [records, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    const applications = records.map((record) => this.toDomainDecrypted(record));

    return { applications, total };
  }

  async updateStatus(id: string, status: string): Promise<Application> {
    try {
      const updated = await this.prisma.application.update({
        where: { id },
        data: { status },
      });
      return this.toDomainDecrypted(updated);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('Record to update not found')
      ) {
        throw new NotFoundError(`Application with id '${id}' not found`);
      }
      throw error;
    }
  }

  async updateBankData(id: string, bankData: Record<string, unknown>): Promise<Application> {
    const existing = await this.prisma.application.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError(`Application with id '${id}' not found`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { bankData: bankData as unknown as import('@prisma/client').Prisma.InputJsonValue },
    });

    return this.toDomainDecrypted(updated);
  }

  async existsByDocumentAndCountry(documentId: string, countryCode: string): Promise<boolean> {
    // AES-256-GCM uses random IVs, so we can't search by re-encrypting.
    // Instead, fetch all records for the country and decrypt to compare.
    const records = await this.prisma.application.findMany({
      where: { countryCode },
      select: { documentId: true },
    });

    return records.some((record) => {
      try {
        const decrypted = this.encryptionService.decrypt(record.documentId);
        return decrypted === documentId;
      } catch {
        return false;
      }
    });
  }
}
