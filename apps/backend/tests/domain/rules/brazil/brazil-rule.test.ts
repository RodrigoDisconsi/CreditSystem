import { describe, it, expect } from 'vitest';
import { BrazilRule } from '../../../../src/domain/rules/brazil/brazil-rule.js';
import { Application } from '../../../../src/domain/entities/application.entity.js';
import type { BrazilBankData } from '@credit-system/shared';
import { approvableBrazilBankData, rejectableBrazilBankData, validBrazilApplication } from '../../../fixtures/applications.js';

describe('BrazilRule', () => {
  const rule = new BrazilRule();

  function makeApp(overrides: Partial<typeof validBrazilApplication> = {}) {
    return Application.create({ ...validBrazilApplication, ...overrides });
  }

  describe('validateDocument', () => {
    it('should validate a correct CPF', () => {
      expect(rule.validateDocument('52998224725')).toBe(true);
    });

    it('should reject an invalid CPF', () => {
      expect(rule.validateDocument('12345678900')).toBe(false);
    });
  });

  describe('evaluateRisk', () => {
    it('should approve when all criteria are met', () => {
      const app = makeApp({ requestedAmount: 10000, monthlyIncome: 5000 });
      const result = rule.evaluateRisk(app, approvableBrazilBankData);
      expect(result.approved).toBe(true);
      expect(result.reason).toContain('All Brazil credit criteria met');
      expect(result.score).toBe(750);
    });

    it('should reject when Serasa score is below 600', () => {
      const app = makeApp();
      const bankData: BrazilBankData = { ...approvableBrazilBankData, creditScore: 500 };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('below minimum threshold of 600');
    });

    it('should reject when monthly income is less than 3x installment', () => {
      const app = makeApp({ requestedAmount: 60000, monthlyIncome: 5000 });
      const result = rule.evaluateRisk(app, approvableBrazilBankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('3x monthly installment');
    });

    it('should reject when applicant has negative history', () => {
      const app = makeApp();
      const bankData: BrazilBankData = { ...approvableBrazilBankData, negativeHistory: true };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('negative credit history');
    });

    it('should reject when debt-to-income ratio exceeds 50%', () => {
      const app = makeApp({ requestedAmount: 10000, monthlyIncome: 5000 });
      const bankData: BrazilBankData = { ...approvableBrazilBankData, totalDebt: 25000 };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('exceeds maximum of 50%');
    });

    it('should include multiple rejection reasons', () => {
      const app = makeApp({ requestedAmount: 10000, monthlyIncome: 1000 });
      const result = rule.evaluateRisk(app, rejectableBrazilBankData);
      expect(result.approved).toBe(false);
      const reasons = result.reason.split(';');
      expect(reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle zero monthly income', () => {
      const app = makeApp({ monthlyIncome: 0 });
      const result = rule.evaluateRisk(app, approvableBrazilBankData);
      expect(result.approved).toBe(false);
    });
  });
});
