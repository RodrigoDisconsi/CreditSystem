import { api } from './api';
import type { Application, PaginatedResponse, ApiResponse, ApplicationFilters, CreateApplicationDTO } from '../types';

export function getApplications(filters: ApplicationFilters = {}) {
  const params = new URLSearchParams();
  if (filters.country) params.set('country', filters.country);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return api.get<PaginatedResponse<Application>>(`/applications${qs ? `?${qs}` : ''}`);
}

export function getApplication(id: string) {
  return api.get<ApiResponse<Application>>(`/applications/${id}`);
}

export function createApplication(data: CreateApplicationDTO) {
  return api.post<ApiResponse<Application>>('/applications', data);
}

export function updateApplicationStatus(id: string, status: string) {
  return api.patch<ApiResponse<Application>>(`/applications/${id}/status`, { status });
}
