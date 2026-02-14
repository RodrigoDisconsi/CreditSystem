import type { BankData } from '@credit-system/shared';

export interface IBankProvider {
  evaluate(
    applicationId: string,
    countryCode: string,
    documentId: string,
  ): Promise<BankData>;
}
