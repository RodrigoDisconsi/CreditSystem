import type { BankData } from '@credit-system/shared';
import type { ApplicationStatus } from '@credit-system/shared';
import type { Application } from '../entities/application.entity.js';
import type { IBankProvider } from '../interfaces/bank-provider.interface.js';
import type { ICountryRule, RiskEvaluationResult } from '../rules/country-rule.interface.js';

export interface CreditEvaluationResult {
  bankData: BankData;
  result: RiskEvaluationResult;
  suggestedStatus: ApplicationStatus;
}

export class CreditEvaluationService {
  constructor(
    private readonly bankProvider: IBankProvider,
    private readonly countryRule: ICountryRule,
  ) {}

  async evaluate(application: Application): Promise<CreditEvaluationResult> {
    // 1. Get bank data via provider
    const bankData = await this.bankProvider.evaluate(
      application.id,
      application.countryCode,
      application.documentId,
    );

    // 2. Run country rules
    const result = this.countryRule.evaluateRisk(application, bankData);

    // 3. Determine suggested status
    const suggestedStatus: ApplicationStatus = result.approved ? 'approved' : 'rejected';

    return {
      bankData,
      result,
      suggestedStatus,
    };
  }
}
