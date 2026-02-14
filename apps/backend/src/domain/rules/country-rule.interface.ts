import type { BankData } from '@credit-system/shared';
import type { Application } from '../entities/application.entity.js';

export interface RiskEvaluationResult {
  approved: boolean;
  reason: string;
  score: number;
}

export interface ICountryRule {
  validateDocument(documentId: string): boolean;
  evaluateRisk(application: Application, bankData: BankData): RiskEvaluationResult;
}
