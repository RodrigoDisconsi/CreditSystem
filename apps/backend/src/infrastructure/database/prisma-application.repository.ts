import type { PrismaClient } from '@prisma/client';
import type { ApplicationFilters } from '@credit-system/shared';
import { PAGINATION_DEFAULTS } from '@credit-system/shared';
import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import { Application } from '../../domain/entities/application.entity.js';
import { ApplicationMapper } from './mappers/application.mapper.js';
import { NotFoundError, ConflictError } from '../../shared/errors/index.js';

export class PrismaApplicationRepository implements IApplicationRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryptionService: IEncryptionService,
  ) {}

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
    const record = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

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

    const applications = records.map((record) => {
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
    });

    return { applications, total };
  }

  async updateStatus(id: string, status: string, updatedAt: Date): Promise<Application> {
    // Optimistic concurrency: only update if updatedAt matches
    const existing = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Application with id '${id}' not found`);
    }

    // Compare timestamps for optimistic concurrency control
    if (existing.updatedAt.getTime() !== updatedAt.getTime()) {
      throw new ConflictError(
        'Application was modified by another process. Please retry.',
        { expectedUpdatedAt: updatedAt.toISOString(), actualUpdatedAt: existing.updatedAt.toISOString() },
      );
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status },
    });

    const domainEntity = ApplicationMapper.toDomain(updated);
    const decryptedDocumentId = this.encryptionService.decrypt(updated.documentId);

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

  async updateBankData(id: string, bankData: Record<string, unknown>): Promise<Application> {
    const existing = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Application with id '${id}' not found`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { bankData: bankData as unknown as import('@prisma/client').Prisma.InputJsonValue },
    });

    const domainEntity = ApplicationMapper.toDomain(updated);
    const decryptedDocumentId = this.encryptionService.decrypt(updated.documentId);

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

  async existsByDocumentAndCountry(documentId: string, countryCode: string): Promise<boolean> {
    const encryptedDocumentId = this.encryptionService.encrypt(documentId);

    const count = await this.prisma.application.count({
      where: {
        documentId: encryptedDocumentId,
        countryCode,
      },
    });

    return count > 0;
  }
}
