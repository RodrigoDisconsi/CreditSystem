import type { ApplicationStatus } from '@credit-system/shared';
import type { RiskEvaluationResult } from './country-rule.interface.js';

/**
 * Determines the application status based on risk evaluation result.
 * Centralized logic used by both worker and webhook use case.
 */
export function determineStatusFromRisk(result: RiskEvaluationResult): ApplicationStatus {
  if (result.approved) return 'approved';
  if (result.score >= 600) return 'under_review';
  return 'rejected';
}
