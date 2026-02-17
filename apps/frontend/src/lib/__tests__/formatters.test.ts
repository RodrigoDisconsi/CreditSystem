import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, maskDocument } from '../formatters';

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format BRL currency', () => {
      const result = formatCurrency(10000, 'BR');
      expect(result).toContain('10');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format MXN currency', () => {
      const result = formatCurrency(50000, 'MX');
      expect(result).toContain('50');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'BR');
      expect(result).toContain('0');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date string', () => {
      const result = formatDate('2024-01-15T10:00:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });
  });

  describe('maskDocument', () => {
    it('should mask document showing last 4 chars', () => {
      expect(maskDocument('52998224725')).toBe('***...4725');
    });

    it('should mask CURP', () => {
      expect(maskDocument('GARC850101HDFRRL09')).toBe('***...RL09');
    });

    it('should return short strings as-is', () => {
      expect(maskDocument('1234')).toBe('1234');
      expect(maskDocument('abc')).toBe('abc');
    });
  });
});
