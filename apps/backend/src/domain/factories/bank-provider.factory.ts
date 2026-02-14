import type { IBankProvider } from '../interfaces/bank-provider.interface.js';

export class BankProviderFactory {
  private readonly providers: Map<string, IBankProvider>;

  constructor(providers?: Map<string, IBankProvider>) {
    this.providers = providers ?? new Map();
  }

  register(countryCode: string, provider: IBankProvider): void {
    this.providers.set(countryCode, provider);
  }

  getProvider(countryCode: string): IBankProvider {
    const provider = this.providers.get(countryCode);
    if (!provider) {
      throw new Error(`No bank provider registered for country code '${countryCode}'`);
    }
    return provider;
  }

  static create(providerEntries: Array<[string, IBankProvider]>): BankProviderFactory {
    return new BankProviderFactory(new Map(providerEntries));
  }
}
