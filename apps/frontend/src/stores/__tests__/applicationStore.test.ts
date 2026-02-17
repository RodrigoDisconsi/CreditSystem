import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useApplicationStore } from '../../stores/applicationStore';

vi.mock('../../services/applicationApi', () => ({
  getApplications: vi.fn(),
}));

describe('ApplicationStore', () => {
  beforeEach(() => {
    useApplicationStore.setState({
      applications: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      filters: {},
      isLoading: false,
      error: null,
    });
  });

  it('should have correct initial state', () => {
    const state = useApplicationStore.getState();
    expect(state.applications).toEqual([]);
    expect(state.page).toBe(1);
    expect(state.filters).toEqual({});
  });

  it('should set filters and reset page', () => {
    useApplicationStore.getState().setPage(3);
    useApplicationStore.getState().setFilter('country', 'BR');

    const state = useApplicationStore.getState();
    expect(state.filters.country).toBe('BR');
    expect(state.page).toBe(1);
  });

  it('should clear filter when value is undefined', () => {
    useApplicationStore.getState().setFilter('country', 'BR');
    useApplicationStore.getState().setFilter('country', undefined);

    const state = useApplicationStore.getState();
    expect(state.filters.country).toBeUndefined();
  });

  it('should update a single application', () => {
    const app1 = { id: 'app-1', status: 'pending' } as any;
    const app2 = { id: 'app-2', status: 'pending' } as any;
    useApplicationStore.setState({ applications: [app1, app2] });

    const updated = { ...app1, status: 'approved' };
    useApplicationStore.getState().updateApplication(updated);

    const state = useApplicationStore.getState();
    expect(state.applications[0].status).toBe('approved');
    expect(state.applications[1].status).toBe('pending');
  });

  it('should add application to beginning', () => {
    const existing = { id: 'app-1' } as any;
    useApplicationStore.setState({ applications: [existing], total: 1 });

    const newApp = { id: 'app-2' } as any;
    useApplicationStore.getState().addApplication(newApp);

    const state = useApplicationStore.getState();
    expect(state.applications[0].id).toBe('app-2');
    expect(state.applications[1].id).toBe('app-1');
    expect(state.total).toBe(2);
  });

  it('should fetch applications', async () => {
    const { getApplications } = await import('../../services/applicationApi');
    (getApplications as any).mockResolvedValue({
      data: [{ id: 'app-1' }],
      pagination: { total: 1, totalPages: 1 },
    });

    await useApplicationStore.getState().fetchApplications();

    const state = useApplicationStore.getState();
    expect(state.applications).toHaveLength(1);
    expect(state.total).toBe(1);
    expect(state.isLoading).toBe(false);
  });

  it('should handle fetch error', async () => {
    const { getApplications } = await import('../../services/applicationApi');
    (getApplications as any).mockRejectedValue(new Error('Network error'));

    await useApplicationStore.getState().fetchApplications();

    const state = useApplicationStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoading).toBe(false);
  });
});
