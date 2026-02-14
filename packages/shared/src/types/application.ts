export type CountryCode = 'BR' | 'MX';

export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

export interface BrazilBankData {
  creditScore: number;
  totalDebt: number;
  openAccounts: number;
  negativeHistory: boolean;
  evaluatedAt: string;
  provider: 'SERASA';
}

export interface MexicoBankData {
  bureauScore: number;
  totalDebt: number;
  activeLoans: number;
  paymentHistory: 'good' | 'regular' | 'bad';
  evaluatedAt: string;
  provider: 'BURO_CREDITO';
}

export type BankData = BrazilBankData | MexicoBankData;

export interface Application {
  id: string;
  countryCode: CountryCode;
  fullName: string;
  documentId: string;
  requestedAmount: number;
  monthlyIncome: number;
  status: ApplicationStatus;
  bankData: BankData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationDTO {
  countryCode: CountryCode;
  fullName: string;
  documentId: string;
  requestedAmount: number;
  monthlyIncome: number;
}

export interface UpdateStatusDTO {
  status: ApplicationStatus;
}

export interface ApplicationFilters {
  country?: CountryCode;
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}
