import { describe, it, expect } from 'vitest';
import { MoneyVO } from '../../../src/domain/value-objects/money.vo.js';

describe('MoneyVO', () => {
  describe('create', () => {
    it('should create money with amount and currency', () => {
      const m = MoneyVO.create(100, 'BRL');
      expect(m.amount).toBe(100);
      expect(m.currency).toBe('BRL');
    });

    it('should uppercase currency', () => {
      const m = MoneyVO.create(100, 'brl');
      expect(m.currency).toBe('BRL');
    });

    it('should allow zero amount', () => {
      const m = MoneyVO.create(0, 'BRL');
      expect(m.amount).toBe(0);
    });

    it('should reject negative amount', () => {
      expect(() => MoneyVO.create(-100, 'BRL')).toThrow('cannot be negative');
    });

    it('should reject empty currency', () => {
      expect(() => MoneyVO.create(100, '')).toThrow('must not be empty');
      expect(() => MoneyVO.create(100, '  ')).toThrow('must not be empty');
    });
  });

  describe('operations', () => {
    it('should add same currency', () => {
      const a = MoneyVO.create(100, 'BRL');
      const b = MoneyVO.create(50, 'BRL');
      const result = a.add(b);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('BRL');
    });

    it('should throw on adding different currencies', () => {
      const a = MoneyVO.create(100, 'BRL');
      const b = MoneyVO.create(50, 'MXN');
      expect(() => a.add(b)).toThrow('Currency mismatch');
    });

    it('should subtract same currency', () => {
      const a = MoneyVO.create(100, 'BRL');
      const b = MoneyVO.create(30, 'BRL');
      const result = a.subtract(b);
      expect(result.amount).toBe(70);
    });

    it('should throw when subtraction results in negative', () => {
      const a = MoneyVO.create(30, 'BRL');
      const b = MoneyVO.create(100, 'BRL');
      expect(() => a.subtract(b)).toThrow('negative amount');
    });

    it('should multiply by factor', () => {
      const m = MoneyVO.create(100, 'BRL');
      const result = m.multiply(3);
      expect(result.amount).toBe(300);
    });

    it('should reject negative multiplication factor', () => {
      const m = MoneyVO.create(100, 'BRL');
      expect(() => m.multiply(-1)).toThrow('cannot be negative');
    });

    it('should compare with isGreaterThan', () => {
      const a = MoneyVO.create(100, 'BRL');
      const b = MoneyVO.create(50, 'BRL');
      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
    });

    it('should check equality', () => {
      const a = MoneyVO.create(100, 'BRL');
      const b = MoneyVO.create(100, 'BRL');
      const c = MoneyVO.create(200, 'BRL');
      const d = MoneyVO.create(100, 'MXN');
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
      expect(a.equals(d)).toBe(false);
    });
  });
});
