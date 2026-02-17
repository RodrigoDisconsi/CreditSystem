import type { Application } from '../../types';

export const mockBrazilApplication: Application = {
  id: 'app-br-001',
  countryCode: 'BR',
  fullName: 'Joao da Silva',
  documentId: '***4725',
  requestedAmount: 10000,
  monthlyIncome: 5000,
  status: 'pending',
  bankData: null,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

export const mockMexicoApplication: Application = {
  id: 'app-mx-001',
  countryCode: 'MX',
  fullName: 'Maria Garcia Lopez',
  documentId: '***L09',
  requestedAmount: 50000,
  monthlyIncome: 30000,
  status: 'approved',
  bankData: null,
  createdAt: '2024-01-16T10:00:00Z',
  updatedAt: '2024-01-16T12:00:00Z',
};

export const mockApplicationsList: Application[] = [
  mockBrazilApplication,
  mockMexicoApplication,
  {
    id: 'app-br-002',
    countryCode: 'BR',
    fullName: 'Pedro Santos',
    documentId: '***5081',
    requestedAmount: 20000,
    monthlyIncome: 8000,
    status: 'under_review',
    bankData: null,
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T11:00:00Z',
  },
  {
    id: 'app-mx-002',
    countryCode: 'MX',
    fullName: 'Carlos Rodriguez',
    documentId: '***R02',
    requestedAmount: 80000,
    monthlyIncome: 45000,
    status: 'rejected',
    bankData: null,
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-18T14:00:00Z',
  },
];
