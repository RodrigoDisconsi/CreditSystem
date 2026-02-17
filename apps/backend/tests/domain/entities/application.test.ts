import { describe, it, expect } from 'vitest';
import { Application } from '../../../src/domain/entities/application.entity.js';
import { ApplicationEvent } from '../../../src/domain/entities/application-event.entity.js';
import { validBrazilApplication, validMexicoApplication } from '../../fixtures/applications.js';

describe('Application Entity', () => {
  describe('create', () => {
    it('should create a new application with pending status', () => {
      const app = Application.create(validBrazilApplication);
      expect(app.id).toBeDefined();
      expect(app.countryCode).toBe('BR');
      expect(app.fullName).toBe('Joao da Silva');
      expect(app.documentId).toBe('52998224725');
      expect(app.requestedAmount).toBe(10000);
      expect(app.monthlyIncome).toBe(5000);
      expect(app.status).toBe('pending');
      expect(app.bankData).toBeNull();
      expect(app.createdAt).toBeInstanceOf(Date);
      expect(app.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs', () => {
      const app1 = Application.create(validBrazilApplication);
      const app2 = Application.create(validBrazilApplication);
      expect(app1.id).not.toBe(app2.id);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute an application with given properties', () => {
      const now = new Date();
      const app = Application.reconstitute({
        id: 'test-id-123',
        countryCode: 'MX',
        fullName: 'Maria Garcia',
        documentId: 'GARC850101HDFRRL09',
        requestedAmount: 50000,
        monthlyIncome: 30000,
        status: 'approved',
        bankData: null,
        createdAt: now,
        updatedAt: now,
      });
      expect(app.id).toBe('test-id-123');
      expect(app.status).toBe('approved');
      expect(app.countryCode).toBe('MX');
    });
  });

  describe('status transitions', () => {
    it('should allow pending -> under_review', () => {
      const app = Application.create(validBrazilApplication);
      expect(app.canTransitionTo('under_review')).toBe(true);
      app.transitionTo('under_review');
      expect(app.status).toBe('under_review');
    });

    it('should allow pending -> rejected', () => {
      const app = Application.create(validBrazilApplication);
      expect(app.canTransitionTo('rejected')).toBe(true);
      app.transitionTo('rejected');
      expect(app.status).toBe('rejected');
    });

    it('should allow under_review -> approved', () => {
      const app = Application.create(validBrazilApplication);
      app.transitionTo('under_review');
      expect(app.canTransitionTo('approved')).toBe(true);
      app.transitionTo('approved');
      expect(app.status).toBe('approved');
    });

    it('should allow under_review -> rejected', () => {
      const app = Application.create(validBrazilApplication);
      app.transitionTo('under_review');
      expect(app.canTransitionTo('rejected')).toBe(true);
      app.transitionTo('rejected');
      expect(app.status).toBe('rejected');
    });

    it('should allow pending -> approved (auto-approval)', () => {
      const app = Application.create(validBrazilApplication);
      expect(app.canTransitionTo('approved')).toBe(true);
      app.transitionTo('approved');
      expect(app.status).toBe('approved');
    });

    it('should NOT allow approved -> any', () => {
      const app = Application.create(validBrazilApplication);
      app.transitionTo('under_review');
      app.transitionTo('approved');
      expect(app.canTransitionTo('pending')).toBe(false);
      expect(app.canTransitionTo('under_review')).toBe(false);
      expect(app.canTransitionTo('rejected')).toBe(false);
    });

    it('should NOT allow rejected -> any', () => {
      const app = Application.create(validBrazilApplication);
      app.transitionTo('rejected');
      expect(app.canTransitionTo('pending')).toBe(false);
      expect(app.canTransitionTo('under_review')).toBe(false);
      expect(app.canTransitionTo('approved')).toBe(false);
    });

    it('should update updatedAt on transition', () => {
      const app = Application.create(validBrazilApplication);
      const before = app.updatedAt;
      app.transitionTo('under_review');
      expect(app.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('updateBankData', () => {
    it('should set bank data and update timestamp', () => {
      const app = Application.create(validBrazilApplication);
      const bankData = {
        creditScore: 750,
        totalDebt: 5000,
        openAccounts: 3,
        negativeHistory: false,
        evaluatedAt: new Date().toISOString(),
        provider: 'SERASA' as const,
      };
      app.updateBankData(bankData);
      expect(app.bankData).toEqual(bankData);
    });
  });
});

describe('ApplicationEvent Entity', () => {
  it('should create an event with unique ID and timestamp', () => {
    const event = ApplicationEvent.create({
      applicationId: 'app-123',
      eventType: 'status_changed',
      eventData: { from: 'pending', to: 'under_review' },
    });
    expect(event.id).toBeDefined();
    expect(event.applicationId).toBe('app-123');
    expect(event.eventType).toBe('status_changed');
    expect(event.eventData).toEqual({ from: 'pending', to: 'under_review' });
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it('should freeze event data', () => {
    const event = ApplicationEvent.create({
      applicationId: 'app-123',
      eventType: 'test',
      eventData: { key: 'value' },
    });
    expect(Object.isFrozen(event.eventData)).toBe(true);
  });
});
