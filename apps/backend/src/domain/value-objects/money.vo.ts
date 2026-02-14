export class MoneyVO {
  readonly amount: number;
  readonly currency: string;

  private constructor(amount: number, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }

  static create(amount: number, currency: string): MoneyVO {
    if (amount < 0) {
      throw new Error(`Money amount cannot be negative. Received: ${amount}`);
    }
    if (!currency || currency.trim().length === 0) {
      throw new Error('Currency must not be empty.');
    }
    return new MoneyVO(amount, currency.toUpperCase());
  }

  private ensureSameCurrency(other: MoneyVO): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Currency mismatch: cannot operate on '${this.currency}' and '${other.currency}'.`,
      );
    }
  }

  add(other: MoneyVO): MoneyVO {
    this.ensureSameCurrency(other);
    return new MoneyVO(this.amount + other.amount, this.currency);
  }

  subtract(other: MoneyVO): MoneyVO {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Subtraction would result in a negative amount.');
    }
    return new MoneyVO(result, this.currency);
  }

  isGreaterThan(other: MoneyVO): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  multiply(factor: number): MoneyVO {
    if (factor < 0) {
      throw new Error(`Multiplication factor cannot be negative. Received: ${factor}`);
    }
    return new MoneyVO(this.amount * factor, this.currency);
  }

  equals(other: MoneyVO): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
