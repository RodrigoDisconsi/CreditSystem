import type { MexicoBankData } from '@credit-system/shared';
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

export class BuroCreditoBankProvider implements IBankProvider {
  async evaluate(
    applicationId: string,
    _countryCode: string,
    documentId: string,
  ): Promise<MexicoBankData> {
    logger.info('BURO_CREDITO: starting evaluation', { applicationId });

    await randomDelay();

    const hash = simpleHash(documentId);

    // Generate deterministic values based on documentId hash
    const bureauScore = 500 + (hash % 351);                       // 500-850
    const totalDebt = (hash % 200000) + 1000;                     // 1000-201000
    const activeLoans = hash % 8;                                  // 0-7
    const paymentHistoryOptions: Array<'good' | 'regular' | 'bad'> = ['good', 'regular', 'bad'];
    const paymentHistory = paymentHistoryOptions[hash % 3];

    const result: MexicoBankData = {
      bureauScore,
      totalDebt,
      activeLoans,
      paymentHistory,
      evaluatedAt: new Date().toISOString(),
      provider: 'BURO_CREDITO',
    };

    logger.info('BURO_CREDITO: evaluation completed', {
      applicationId,
      bureauScore: result.bureauScore,
    });

    return result;
  }
}
