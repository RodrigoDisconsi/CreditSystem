import { describe, it, expect } from 'vitest';
import { validateCURP } from '../../../../src/domain/rules/mexico/curp-validator.js';

describe('CURP Validator', () => {
  describe('valid CURPs', () => {
    it('should accept a valid CURP with H gender marker', () => {
      expect(validateCURP('GARC850101HDFRRL09')).toBe(true);
    });

    it('should accept a valid CURP with M gender marker', () => {
      expect(validateCURP('LOPM900215MDFRRR01')).toBe(true);
    });

    it('should accept lowercase and convert to uppercase', () => {
      expect(validateCURP('garc850101hdfrrl09')).toBe(true);
    });
  });

  describe('invalid CURPs', () => {
    it('should reject CURP with wrong length', () => {
      expect(validateCURP('GARC850101HDFRRL0')).toBe(false);
      expect(validateCURP('GARC850101HDFRRL099')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateCURP('')).toBe(false);
    });

    it('should reject CURP with numbers in first 4 positions', () => {
      expect(validateCURP('1ARC850101HDFRRL09')).toBe(false);
    });

    it('should reject CURP without H or M gender marker', () => {
      expect(validateCURP('GARC850101XDFRRL09')).toBe(false);
    });

    it('should reject CURP with letters in date positions', () => {
      expect(validateCURP('GARCABCDEFHDFRRL09')).toBe(false);
    });

    it('should reject null/undefined gracefully', () => {
      expect(validateCURP(null as any)).toBe(false);
      expect(validateCURP(undefined as any)).toBe(false);
    });
  });
});
