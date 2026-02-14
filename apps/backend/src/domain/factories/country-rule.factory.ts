import type { ICountryRule } from '../rules/country-rule.interface.js';
import { BrazilRule } from '../rules/brazil/brazil-rule.js';
import { MexicoRule } from '../rules/mexico/mexico-rule.js';

const ruleMap: Record<string, () => ICountryRule> = {
  BR: () => new BrazilRule(),
  MX: () => new MexicoRule(),
};

export function createCountryRule(countryCode: string): ICountryRule {
  const factory = ruleMap[countryCode];
  if (!factory) {
    throw new Error(`No country rule found for country code '${countryCode}'`);
  }
  return factory();
}

export class CountryRuleFactory {
  getRule(countryCode: string): ICountryRule {
    return createCountryRule(countryCode);
  }
}
