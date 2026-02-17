import { PrismaClient } from '@prisma/client';
import type { IEncryptionService } from '../domain/interfaces/encryption.interface.js';
import { logger } from '../shared/logger.js';

export async function autoSeedIfEmpty(prisma: PrismaClient, encryptionService: IEncryptionService): Promise<void> {
  const count = await prisma.application.count();
  if (count > 0) {
    logger.info(`Database already has ${count} applications, skipping auto-seed`);
    return;
  }

  logger.info('Database is empty, running auto-seed...');

  const enc = (plaintext: string) => encryptionService.encrypt(plaintext);

  // Brazil applications
  const brPending = await prisma.application.create({
    data: {
      countryCode: 'BR',
      fullName: 'Carlos Silva',
      documentId: enc('12345678901'),
      requestedAmount: 50000.0,
      monthlyIncome: 12000.0,
      status: 'pending',
    },
  });

  const brUnderReview = await prisma.application.create({
    data: {
      countryCode: 'BR',
      fullName: 'Maria Oliveira',
      documentId: enc('98765432100'),
      requestedAmount: 25000.0,
      monthlyIncome: 8000.0,
      status: 'under_review',
      bankData: {
        creditScore: 720,
        totalDebt: 5000,
        openAccounts: 3,
        negativeHistory: false,
        evaluatedAt: new Date().toISOString(),
        provider: 'SERASA',
      },
    },
  });

  const brApproved = await prisma.application.create({
    data: {
      countryCode: 'BR',
      fullName: 'Ana Santos',
      documentId: enc('11122233344'),
      requestedAmount: 15000.0,
      monthlyIncome: 6000.0,
      status: 'approved',
      bankData: {
        creditScore: 850,
        totalDebt: 1000,
        openAccounts: 2,
        negativeHistory: false,
        evaluatedAt: new Date().toISOString(),
        provider: 'SERASA',
      },
    },
  });

  // Mexico applications
  const mxPending = await prisma.application.create({
    data: {
      countryCode: 'MX',
      fullName: 'Juan Garcia',
      documentId: enc('GAGJ800101HDFRRL09'),
      requestedAmount: 100000.0,
      monthlyIncome: 30000.0,
      status: 'pending',
    },
  });

  const mxRejected = await prisma.application.create({
    data: {
      countryCode: 'MX',
      fullName: 'Sofia Lopez',
      documentId: enc('LOPS900515MDFRRL01'),
      requestedAmount: 200000.0,
      monthlyIncome: 15000.0,
      status: 'rejected',
      bankData: {
        bureauScore: 520,
        totalDebt: 80000,
        activeLoans: 5,
        paymentHistory: 'bad' as const,
        evaluatedAt: new Date().toISOString(),
        provider: 'BURO_CREDITO',
      },
    },
  });

  const mxApproved = await prisma.application.create({
    data: {
      countryCode: 'MX',
      fullName: 'Roberto Martinez',
      documentId: enc('MARR850220HDFRRT05'),
      requestedAmount: 75000.0,
      monthlyIncome: 45000.0,
      status: 'approved',
      bankData: {
        bureauScore: 780,
        totalDebt: 10000,
        activeLoans: 1,
        paymentHistory: 'good' as const,
        evaluatedAt: new Date().toISOString(),
        provider: 'BURO_CREDITO',
      },
    },
  });

  // Create events
  await prisma.applicationEvent.createMany({
    data: [
      { applicationId: brPending.id, eventType: 'application:created', eventData: { fullName: 'Carlos Silva', countryCode: 'BR' } },
      { applicationId: brUnderReview.id, eventType: 'application:created', eventData: { fullName: 'Maria Oliveira', countryCode: 'BR' } },
      { applicationId: brUnderReview.id, eventType: 'application:status-changed', eventData: { oldStatus: 'pending', newStatus: 'under_review' } },
      { applicationId: brApproved.id, eventType: 'application:created', eventData: { fullName: 'Ana Santos', countryCode: 'BR' } },
      { applicationId: brApproved.id, eventType: 'application:status-changed', eventData: { oldStatus: 'pending', newStatus: 'under_review' } },
      { applicationId: brApproved.id, eventType: 'application:status-changed', eventData: { oldStatus: 'under_review', newStatus: 'approved' } },
      { applicationId: mxPending.id, eventType: 'application:created', eventData: { fullName: 'Juan Garcia', countryCode: 'MX' } },
      { applicationId: mxRejected.id, eventType: 'application:created', eventData: { fullName: 'Sofia Lopez', countryCode: 'MX' } },
      { applicationId: mxRejected.id, eventType: 'application:status-changed', eventData: { oldStatus: 'pending', newStatus: 'under_review' } },
      { applicationId: mxRejected.id, eventType: 'application:status-changed', eventData: { oldStatus: 'under_review', newStatus: 'rejected' } },
      { applicationId: mxApproved.id, eventType: 'application:created', eventData: { fullName: 'Roberto Martinez', countryCode: 'MX' } },
      { applicationId: mxApproved.id, eventType: 'application:status-changed', eventData: { oldStatus: 'pending', newStatus: 'under_review' } },
      { applicationId: mxApproved.id, eventType: 'application:status-changed', eventData: { oldStatus: 'under_review', newStatus: 'approved' } },
    ],
  });

  logger.info('Auto-seed completed: 6 applications created (3 BR, 3 MX)');
}
