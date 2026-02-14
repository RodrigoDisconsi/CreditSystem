import { randomUUID } from 'crypto';
import type {
  CountryCode,
  ApplicationStatus,
  BrazilBankData,
  MexicoBankData,
  BankData,
} from '@credit-system/shared';
import { VALID_STATUS_TRANSITIONS } from '@credit-system/shared';

export interface ApplicationProps {
  countryCode: CountryCode;
  fullName: string;
  documentId: string;
  requestedAmount: number;
  monthlyIncome: number;
}

export interface ApplicationReconstituteProps {
  id: string;
  countryCode: CountryCode;
  fullName: string;
  documentId: string;
  requestedAmount: number;
  monthlyIncome: number;
  status: ApplicationStatus;
  bankData: BrazilBankData | MexicoBankData | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Application {
  readonly id: string;
  readonly countryCode: CountryCode;
  readonly fullName: string;
  readonly documentId: string;
  readonly requestedAmount: number;
  readonly monthlyIncome: number;
  private _status: ApplicationStatus;
  private _bankData: BrazilBankData | MexicoBankData | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    countryCode: CountryCode,
    fullName: string,
    documentId: string,
    requestedAmount: number,
    monthlyIncome: number,
    status: ApplicationStatus,
    bankData: BrazilBankData | MexicoBankData | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.countryCode = countryCode;
    this.fullName = fullName;
    this.documentId = documentId;
    this.requestedAmount = requestedAmount;
    this.monthlyIncome = monthlyIncome;
    this._status = status;
    this._bankData = bankData;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get status(): ApplicationStatus {
    return this._status;
  }

  get bankData(): BankData | null {
    return this._bankData;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(props: ApplicationProps): Application {
    const now = new Date();
    return new Application(
      randomUUID(),
      props.countryCode,
      props.fullName,
      props.documentId,
      props.requestedAmount,
      props.monthlyIncome,
      'pending',
      null,
      now,
      now,
    );
  }

  static reconstitute(props: ApplicationReconstituteProps): Application {
    return new Application(
      props.id,
      props.countryCode,
      props.fullName,
      props.documentId,
      props.requestedAmount,
      props.monthlyIncome,
      props.status,
      props.bankData,
      props.createdAt,
      props.updatedAt,
    );
  }

  canTransitionTo(newStatus: ApplicationStatus): boolean {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[this._status];
    return allowedTransitions.includes(newStatus);
  }

  transitionTo(newStatus: ApplicationStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition from '${this._status}' to '${newStatus}'`,
      );
    }
    this._status = newStatus;
    this._updatedAt = new Date();
  }

  updateBankData(data: BrazilBankData | MexicoBankData): void {
    this._bankData = data;
    this._updatedAt = new Date();
  }
}
