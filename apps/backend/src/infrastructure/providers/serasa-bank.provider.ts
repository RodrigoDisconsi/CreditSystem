import type { BrazilBankData } from '@credit-system/shared';
import type { IBankProvider } from '../../domain/interfaces/bank-provider.interface.js';
import { logger } from '../../shared/logger.js';

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function randomDelay(): Promise<void> {
  const ms = 2000 + Math.random() * 2000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SerasaBankProvider implements IBankProvider {
  async evaluate(
    applicationId: string,
    _countryCode: string,
    documentId: string,
  ): Promise<BrazilBankData> {
    logger.info('SERASA: starting evaluation', { applicationId });

    await randomDelay();

    const hash = simpleHash(documentId);

    // Generate deterministic values based on documentId hash
    const creditScore = 300 + (hash % 701);                       // 300-1000
    const totalDebt = (hash % 100000) + 500;                      // 500-100499
    const openAccounts = (hash % 10) + 1;                         // 1-10
    const negativeHistory = (hash % 3) === 0;                     // ~33% chance

    const result: BrazilBankData = {
      creditScore,
      totalDebt,
      openAccounts,
      negativeHistory,
      evaluatedAt: new Date().toISOString(),
      provider: 'SERASA',
    };

    logger.info('SERASA: evaluation completed', {
      applicationId,
      creditScore: result.creditScore,
    });

    return result;
  }
}
