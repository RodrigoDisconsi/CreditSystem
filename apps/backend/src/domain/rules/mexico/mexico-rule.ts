import type { BankData, MexicoBankData } from '@credit-system/shared';
import type { Application } from '../../entities/application.entity.js';
import type { ICountryRule, RiskEvaluationResult } from '../country-rule.interface.js';
import { validateCURP } from './curp-validator.js';

export class MexicoRule implements ICountryRule {
  validateDocument(documentId: string): boolean {
    return validateCURP(documentId);
  }

  evaluateRisk(application: Application, bankData: BankData): RiskEvaluationResult {
    const data = bankData as MexicoBankData;
    const reasons: string[] = [];

    // 1. Bureau score >= 650
    if (data.bureauScore < 650) {
      reasons.push(`Bureau score ${data.bureauScore} is below minimum threshold of 650`);
    }

    // 2. Debt-to-income ratio: totalDebt / monthlyIncome < 0.40
    const debtToIncome = application.monthlyIncome > 0
      ? data.totalDebt / application.monthlyIncome
      : Infinity;
    if (debtToIncome >= 0.40) {
      reasons.push(
        `Debt-to-income ratio ${(debtToIncome * 100).toFixed(1)}% exceeds maximum of 40%`,
      );
    }

    // 3. Payment history must not be 'bad'
    if (data.paymentHistory === 'bad') {
      reasons.push('Applicant has bad payment history');
    }

    // 4. Active loans <= 3
    if (data.activeLoans > 3) {
      reasons.push(`Active loans count ${data.activeLoans} exceeds maximum of 3`);
    }

    // If any hard criteria failed, reject
    if (reasons.length > 0) {
      return {
        approved: false,
        reason: reasons.join('; '),
        score: data.bureauScore,
      };
    }

    // 5. Requested amount <= 100,000 MXN for auto-approval
    if (application.requestedAmount > 100000) {
      return {
        approved: false,
        reason: `Requested amount ${application.requestedAmount} MXN exceeds auto-approval limit of 100,000 MXN; requires manual review`,
        score: data.bureauScore,
      };
    }

    return {
      approved: true,
      reason: 'All Mexico credit criteria met',
      score: data.bureauScore,
    };
  }
}
