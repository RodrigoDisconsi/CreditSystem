import { describe, it, expect } from 'vitest';
import { validateCPF } from '../../../../src/domain/rules/brazil/cpf-validator.js';

describe('CPF Validator', () => {
  describe('valid CPFs', () => {
    it('should accept a valid CPF without formatting', () => {
      expect(validateCPF('52998224725')).toBe(true);
    });

    it('should accept a valid CPF with formatting', () => {
      expect(validateCPF('529.982.247-25')).toBe(true);
    });

    it('should accept another valid CPF', () => {
      expect(validateCPF('11144477735')).toBe(true);
    });

    it('should accept valid CPF 31785409620', () => {
      expect(validateCPF('31785409620')).toBe(true);
    });
  });

  describe('invalid CPFs', () => {
    it('should reject CPF with wrong length', () => {
      expect(validateCPF('1234567890')).toBe(false);
      expect(validateCPF('123456789012')).toBe(false);
    });

    it('should reject all-same-digit CPFs', () => {
      expect(validateCPF('11111111111')).toBe(false);
      expect(validateCPF('22222222222')).toBe(false);
      expect(validateCPF('33333333333')).toBe(false);
      expect(validateCPF('00000000000')).toBe(false);
      expect(validateCPF('99999999999')).toBe(false);
    });

    it('should reject CPF with wrong verification digits', () => {
      expect(validateCPF('52998224726')).toBe(false);
      expect(validateCPF('52998224715')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateCPF('')).toBe(false);
    });

    it('should reject non-numeric string', () => {
      expect(validateCPF('abcdefghijk')).toBe(false);
    });

    it('should reject CPF with letters mixed in', () => {
      expect(validateCPF('5299822472a')).toBe(false);
    });
  });
});
