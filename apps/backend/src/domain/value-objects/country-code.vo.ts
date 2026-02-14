import type { CountryCode } from '@credit-system/shared';

const VALID_COUNTRY_CODES: ReadonlySet<string> = new Set(['BR', 'MX']);

export class CountryCodeVO {
  readonly value: CountryCode;

  private constructor(value: CountryCode) {
    this.value = value;
  }

  static create(value: string): CountryCodeVO {
    if (!VALID_COUNTRY_CODES.has(value)) {
      throw new Error(`Invalid country code '${value}'. Must be 'BR' or 'MX'.`);
    }
    return new CountryCodeVO(value as CountryCode);
  }

  equals(other: CountryCodeVO): boolean {
    return this.value === other.value;
  }
}
