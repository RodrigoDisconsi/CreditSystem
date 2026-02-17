import type { ApplicationProps } from '../../src/domain/entities/application.entity.js';
import type { BrazilBankData, MexicoBankData } from '@credit-system/shared';

export const validBrazilApplication: ApplicationProps = {
  countryCode: 'BR',
  fullName: 'Joao da Silva',
  documentId: '52998224725',
  requestedAmount: 10000,
  monthlyIncome: 5000,
};

export const validMexicoApplication: ApplicationProps = {
  countryCode: 'MX',
  fullName: 'Maria Garcia Lopez',
  documentId: 'GARC850101HDFRRL09',
  requestedAmount: 50000,
  monthlyIncome: 30000,
};

export const approvableBrazilBankData: BrazilBankData = {
  creditScore: 750,
  totalDebt: 5000,
  openAccounts: 3,
  negativeHistory: false,
  evaluatedAt: new Date().toISOString(),
  provider: 'SERASA',
};

export const rejectableBrazilBankData: BrazilBankData = {
  creditScore: 400,
  totalDebt: 100000,
  openAccounts: 1,
  negativeHistory: true,
  evaluatedAt: new Date().toISOString(),
  provider: 'SERASA',
};

export const approvableMexicoBankData: MexicoBankData = {
  bureauScore: 720,
  totalDebt: 5000,
  activeLoans: 1,
  paymentHistory: 'good',
  evaluatedAt: new Date().toISOString(),
  provider: 'BURO_CREDITO',
};

export const rejectableMexicoBankData: MexicoBankData = {
  bureauScore: 500,
  totalDebt: 50000,
  activeLoans: 5,
  paymentHistory: 'bad',
  evaluatedAt: new Date().toISOString(),
  provider: 'BURO_CREDITO',
};

export function createBrazilApplicationProps(overrides?: Partial<ApplicationProps>): ApplicationProps {
  return { ...validBrazilApplication, ...overrides };
}

export function createMexicoApplicationProps(overrides?: Partial<ApplicationProps>): ApplicationProps {
  return { ...validMexicoApplication, ...overrides };
}
