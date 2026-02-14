import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.applicationEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();

  // Brazil applications
  const brPending = await prisma.application.create({
    data: {
      countryCode: 'BR',
      fullName: 'Carlos Silva',
      documentId: '12345678901',
      requestedAmount: 50000.00,
      monthlyIncome: 12000.00,
      status: 'pending',
    },
  });

  const brUnderReview = await prisma.application.create({
    data: {
      countryCode: 'BR',
      fullName: 'Maria Oliveira',
      documentId: '98765432100',
      requestedAmount: 25000.00,
      monthlyIncome: 8000.00,
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
      documentId: '11122233344',
      requestedAmount: 15000.00,
      monthlyIncome: 6000.00,
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
      documentId: 'GAGJ800101HDFRRL09',
      requestedAmount: 100000.00,
      monthlyIncome: 30000.00,
      status: 'pending',
    },
  });

  const mxRejected = await prisma.application.create({
    data: {
      countryCode: 'MX',
      fullName: 'Sofia Lopez',
      documentId: 'LOPS900515MDFRRL01',
      requestedAmount: 200000.00,
      monthlyIncome: 15000.00,
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
      documentId: 'MARR850220HDFRRT05',
      requestedAmount: 75000.00,
      monthlyIncome: 45000.00,
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

  // Create events for applications with status changes
  await prisma.applicationEvent.createMany({
    data: [
      {
        applicationId: brPending.id,
        eventType: 'application:created',
        eventData: { fullName: 'Carlos Silva', countryCode: 'BR' },
      },
      {
        applicationId: brUnderReview.id,
        eventType: 'application:created',
        eventData: { fullName: 'Maria Oliveira', countryCode: 'BR' },
      },
      {
        applicationId: brUnderReview.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'pending', newStatus: 'under_review' },
      },
      {
        applicationId: brApproved.id,
        eventType: 'application:created',
        eventData: { fullName: 'Ana Santos', countryCode: 'BR' },
      },
      {
        applicationId: brApproved.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'pending', newStatus: 'under_review' },
      },
      {
        applicationId: brApproved.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'under_review', newStatus: 'approved' },
      },
      {
        applicationId: mxPending.id,
        eventType: 'application:created',
        eventData: { fullName: 'Juan Garcia', countryCode: 'MX' },
      },
      {
        applicationId: mxRejected.id,
        eventType: 'application:created',
        eventData: { fullName: 'Sofia Lopez', countryCode: 'MX' },
      },
      {
        applicationId: mxRejected.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'pending', newStatus: 'under_review' },
      },
      {
        applicationId: mxRejected.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'under_review', newStatus: 'rejected' },
      },
      {
        applicationId: mxApproved.id,
        eventType: 'application:created',
        eventData: { fullName: 'Roberto Martinez', countryCode: 'MX' },
      },
      {
        applicationId: mxApproved.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'pending', newStatus: 'under_review' },
      },
      {
        applicationId: mxApproved.id,
        eventType: 'application:status-changed',
        eventData: { oldStatus: 'under_review', newStatus: 'approved' },
      },
    ],
  });

  console.log('Seed completed successfully.');
  console.log(`Created applications: ${brPending.id}, ${brUnderReview.id}, ${brApproved.id}, ${mxPending.id}, ${mxRejected.id}, ${mxApproved.id}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
