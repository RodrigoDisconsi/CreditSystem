import { describe, it, expect } from 'vitest';
import { CountryCodeVO } from '../../../src/domain/value-objects/country-code.vo.js';

describe('CountryCodeVO', () => {
  it('should create BR country code', () => {
    const cc = CountryCodeVO.create('BR');
    expect(cc.value).toBe('BR');
  });

  it('should create MX country code', () => {
    const cc = CountryCodeVO.create('MX');
    expect(cc.value).toBe('MX');
  });

  it('should throw for invalid country code', () => {
    expect(() => CountryCodeVO.create('US')).toThrow("Invalid country code 'US'");
    expect(() => CountryCodeVO.create('')).toThrow('Invalid country code');
    expect(() => CountryCodeVO.create('br')).toThrow('Invalid country code');
  });

  it('should compare equality correctly', () => {
    const br1 = CountryCodeVO.create('BR');
    const br2 = CountryCodeVO.create('BR');
    const mx = CountryCodeVO.create('MX');
    expect(br1.equals(br2)).toBe(true);
    expect(br1.equals(mx)).toBe(false);
  });
});
