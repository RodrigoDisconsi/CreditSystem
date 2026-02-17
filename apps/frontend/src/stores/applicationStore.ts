import { create } from 'zustand';
import type { Application, ApplicationStatus, CountryCode } from '../types';
import { getApplications } from '../services/applicationApi';

interface ApplicationState {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: { country?: CountryCode; status?: ApplicationStatus };
  isLoading: boolean;
  error: string | null;
  fetchApplications: () => Promise<void>;
  setFilter: (key: string, value: string | undefined) => void;
  setPage: (page: number) => void;
  updateApplication: (updated: Application) => void;
  addApplication: (app: Application) => void;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  applications: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  filters: {},
  isLoading: false,
  error: null,

  fetchApplications: async () => {
    const { filters, page, limit } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await getApplications({ ...filters, page, limit });
      set({
        applications: res.data,
        total: res.pagination.total,
        totalPages: res.pagination.totalPages,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch', isLoading: false });
    }
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value || undefined }, page: 1 }));
  },

  setPage: (page) => set({ page }),

  updateApplication: (updated) => {
    set((s) => ({
      applications: s.applications.map((a) => (a.id === updated.id ? updated : a)),
    }));
  },

  addApplication: (app) => {
    set((s) => ({ applications: [app, ...s.applications], total: s.total + 1 }));
  },
}));
