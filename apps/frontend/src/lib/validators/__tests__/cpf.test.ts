import { describe, it, expect } from 'vitest';
import { validateCPF } from '../../validators/cpf';

describe('Frontend CPF Validator', () => {
  it('should accept valid CPF without formatting', () => {
    expect(validateCPF('52998224725')).toBe(true);
  });

  it('should accept valid CPF with formatting', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
  });

  it('should accept valid CPF 11144477735', () => {
    expect(validateCPF('11144477735')).toBe(true);
  });

  it('should reject all-same-digit CPFs', () => {
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('00000000000')).toBe(false);
  });

  it('should reject CPF with wrong check digits', () => {
    expect(validateCPF('52998224726')).toBe(false);
  });

  it('should reject wrong length', () => {
    expect(validateCPF('123456')).toBe(false);
    expect(validateCPF('')).toBe(false);
  });
});
