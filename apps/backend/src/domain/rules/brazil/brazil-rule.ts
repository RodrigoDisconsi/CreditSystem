import type { BankData, BrazilBankData } from '@credit-system/shared';
import type { Application } from '../../entities/application.entity.js';
import type { ICountryRule, RiskEvaluationResult } from '../country-rule.interface.js';
import { validateCPF } from './cpf-validator.js';

export class BrazilRule implements ICountryRule {
  validateDocument(documentId: string): boolean {
    return validateCPF(documentId);
  }

  evaluateRisk(application: Application, bankData: BankData): RiskEvaluationResult {
    const data = bankData as BrazilBankData;
    const reasons: string[] = [];

    // 1. Serasa credit score check (>= 600)
    if (data.creditScore < 600) {
      reasons.push(`Serasa score ${data.creditScore} is below minimum threshold of 600`);
    }

    // 2. Monthly income must be >= 3x the monthly installment (assume 12-month loan)
    const monthlyInstallment = application.requestedAmount / 12;
    const requiredIncome = monthlyInstallment * 3;
    if (application.monthlyIncome < requiredIncome) {
      reasons.push(
        `Monthly income ${application.monthlyIncome} is below required ${requiredIncome.toFixed(2)} (3x monthly installment)`,
      );
    }

    // 3. No negative history
    if (data.negativeHistory === true) {
      reasons.push('Applicant has negative credit history');
    }

    // 4. Debt-to-income ratio: (totalDebt + requestedAmount) / (monthlyIncome * 12) < 0.50
    const annualIncome = application.monthlyIncome * 12;
    const debtRatio = annualIncome > 0
      ? (data.totalDebt + application.requestedAmount) / annualIncome
      : Infinity;
    if (debtRatio >= 0.50) {
      reasons.push(
        `Debt-to-income ratio ${(debtRatio * 100).toFixed(1)}% exceeds maximum of 50%`,
      );
    }

    const approved = reasons.length === 0;

    return {
      approved,
      reason: approved
        ? 'All Brazil credit criteria met'
        : reasons.join('; '),
      score: data.creditScore,
    };
  }
}
