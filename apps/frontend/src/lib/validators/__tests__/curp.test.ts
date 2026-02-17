import { describe, it, expect } from 'vitest';
import { validateCURP } from '../../validators/curp';

describe('Frontend CURP Validator', () => {
  it('should accept valid CURP', () => {
    expect(validateCURP('GARC850101HDFRRL09')).toBe(true);
  });

  it('should accept valid CURP with M gender', () => {
    expect(validateCURP('LOPM900215MDFRRR01')).toBe(true);
  });

  it('should reject wrong length', () => {
    expect(validateCURP('SHORT')).toBe(false);
    expect(validateCURP('')).toBe(false);
  });

  it('should reject invalid format', () => {
    expect(validateCURP('1234567890123456XY')).toBe(false);
  });

  it('should reject CURP without H or M', () => {
    expect(validateCURP('GARC850101XDFRRL09')).toBe(false);
  });
});
