import type { ApplicationStatus, CountryCode } from '../types/application.js';

export const STATUS: Record<ApplicationStatus, ApplicationStatus> = {
  pending: 'pending',
  under_review: 'under_review',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

export const COUNTRIES: Record<CountryCode, { name: string; currency: string; documentName: string }> = {
  BR: { name: 'Brazil', currency: 'BRL', documentName: 'CPF' },
  MX: { name: 'Mexico', currency: 'MXN', documentName: 'CURP' },
};

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;
