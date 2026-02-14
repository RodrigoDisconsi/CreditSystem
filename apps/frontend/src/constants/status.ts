import type { ApplicationStatus } from '../types/index.js';

export const STATUS_STYLES: Record<ApplicationStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Pending' },
  under_review: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Under Review' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Rejected' },
};
