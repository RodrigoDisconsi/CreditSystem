import { Prisma } from '@prisma/client';
import type { Application as PrismaApplication } from '@prisma/client';
import type { ApplicationStatus, CountryCode, BankData } from '@credit-system/shared';
import { Application } from '../../../domain/entities/application.entity.js';

export class ApplicationMapper {
  static toDomain(prismaApp: PrismaApplication): Application {
    return Application.reconstitute({
      id: prismaApp.id,
      countryCode: prismaApp.countryCode as CountryCode,
      fullName: prismaApp.fullName,
      documentId: prismaApp.documentId,
      requestedAmount: prismaApp.requestedAmount.toNumber(),
      monthlyIncome: prismaApp.monthlyIncome.toNumber(),
      status: prismaApp.status as ApplicationStatus,
      bankData: prismaApp.bankData as BankData | null,
      createdAt: prismaApp.createdAt,
      updatedAt: prismaApp.updatedAt,
    });
  }

  static toPrismaCreate(application: Application): Prisma.ApplicationCreateInput {
    return {
      id: application.id,
      countryCode: application.countryCode,
      fullName: application.fullName,
      documentId: application.documentId,
      requestedAmount: new Prisma.Decimal(application.requestedAmount),
      monthlyIncome: new Prisma.Decimal(application.monthlyIncome),
      status: application.status,
      bankData: (application.bankData as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
