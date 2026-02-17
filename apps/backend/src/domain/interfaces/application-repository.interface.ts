import { Application } from '../entities/application.entity.js';
import type { ApplicationFilters } from '@credit-system/shared';

export interface IApplicationRepository {
  create(application: Application): Promise<Application>;
  findById(id: string): Promise<Application | null>;
  findByFilters(filters: ApplicationFilters): Promise<{ applications: Application[]; total: number }>;
  updateStatus(id: string, status: string): Promise<Application>;
  updateBankData(id: string, bankData: Record<string, unknown>): Promise<Application>;
  existsByDocumentAndCountry(documentId: string, countryCode: string): Promise<boolean>;
}
