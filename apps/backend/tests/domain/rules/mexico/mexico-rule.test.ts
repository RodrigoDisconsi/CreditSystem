import { describe, it, expect } from 'vitest';
import { MexicoRule } from '../../../../src/domain/rules/mexico/mexico-rule.js';
import { Application } from '../../../../src/domain/entities/application.entity.js';
import type { MexicoBankData } from '@credit-system/shared';
import { approvableMexicoBankData, rejectableMexicoBankData, validMexicoApplication } from '../../../fixtures/applications.js';

describe('MexicoRule', () => {
  const rule = new MexicoRule();

  function makeApp(overrides: Partial<typeof validMexicoApplication> = {}) {
    return Application.create({ ...validMexicoApplication, ...overrides });
  }

  describe('validateDocument', () => {
    it('should validate a correct CURP', () => {
      expect(rule.validateDocument('GARC850101HDFRRL09')).toBe(true);
    });

    it('should reject an invalid CURP', () => {
      expect(rule.validateDocument('INVALID123')).toBe(false);
    });
  });

  describe('evaluateRisk', () => {
    it('should approve when all criteria are met and amount <= 100,000', () => {
      const app = makeApp({ requestedAmount: 50000, monthlyIncome: 30000 });
      const result = rule.evaluateRisk(app, approvableMexicoBankData);
      expect(result.approved).toBe(true);
      expect(result.reason).toContain('All Mexico credit criteria met');
      expect(result.score).toBe(720);
    });

    it('should reject when bureau score is below 650', () => {
      const app = makeApp();
      const bankData: MexicoBankData = { ...approvableMexicoBankData, bureauScore: 600 };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('below minimum threshold of 650');
    });

    it('should reject when debt-to-income ratio exceeds 40%', () => {
      const app = makeApp({ monthlyIncome: 30000 });
      const bankData: MexicoBankData = { ...approvableMexicoBankData, totalDebt: 15000 };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('exceeds maximum of 40%');
    });

    it('should reject when payment history is bad', () => {
      const app = makeApp();
      const bankData: MexicoBankData = { ...approvableMexicoBankData, paymentHistory: 'bad' };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('bad payment history');
    });

    it('should reject when active loans exceed 3', () => {
      const app = makeApp();
      const bankData: MexicoBankData = { ...approvableMexicoBankData, activeLoans: 5 };
      const result = rule.evaluateRisk(app, bankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('exceeds maximum of 3');
    });

    it('should reject when amount exceeds 100,000 MXN even with good criteria', () => {
      const app = makeApp({ requestedAmount: 150000, monthlyIncome: 100000 });
      const result = rule.evaluateRisk(app, approvableMexicoBankData);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('auto-approval limit');
    });

    it('should approve at exactly 100,000 MXN', () => {
      const app = makeApp({ requestedAmount: 100000, monthlyIncome: 100000 });
      const result = rule.evaluateRisk(app, approvableMexicoBankData);
      expect(result.approved).toBe(true);
    });

    it('should include multiple rejection reasons when multiple criteria fail', () => {
      const app = makeApp({ requestedAmount: 50000, monthlyIncome: 10000 });
      const result = rule.evaluateRisk(app, rejectableMexicoBankData);
      expect(result.approved).toBe(false);
      const reasons = result.reason.split(';');
      expect(reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle zero monthly income', () => {
      const app = makeApp({ monthlyIncome: 0 });
      const result = rule.evaluateRisk(app, approvableMexicoBankData);
      expect(result.approved).toBe(false);
    });
  });
});
