export class DocumentIdVO {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string, countryCode: string): DocumentIdVO {
    if (!value || value.trim().length === 0) {
      throw new Error('Document ID cannot be empty.');
    }

    if (countryCode !== 'BR' && countryCode !== 'MX') {
      throw new Error(`Unsupported country code '${countryCode}' for document validation.`);
    }

    return new DocumentIdVO(value.trim());
  }

  equals(other: DocumentIdVO): boolean {
    return this.value === other.value;
  }
}
