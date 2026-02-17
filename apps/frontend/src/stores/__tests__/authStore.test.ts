import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../services/auth', () => ({
  loginApi: vi.fn(),
}));

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
  });

  it('should start with no authentication', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('should set auth data with setAuth', () => {
    const user = { userId: 'u1', email: 'test@test.com', role: 'admin' };
    useAuthStore.getState().setAuth('token123', 'refresh456', user);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('token123');
    expect(state.refreshToken).toBe('refresh456');
    expect(state.user).toEqual(user);
    expect(localStorage.getItem('token')).toBe('token123');
  });

  it('should clear auth data on logout', () => {
    const user = { userId: 'u1', email: 'test@test.com', role: 'admin' };
    useAuthStore.getState().setAuth('token123', 'refresh456', user);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle login success', async () => {
    const { loginApi } = await import('../../services/auth');
    (loginApi as any).mockResolvedValue({
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      user: { userId: 'u1', email: 'admin@credit.com', role: 'admin' },
    });

    await useAuthStore.getState().login('admin@credit.com', 'admin123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('jwt-token');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should handle login failure', async () => {
    const { loginApi } = await import('../../services/auth');
    (loginApi as any).mockRejectedValue(new Error('Invalid credentials'));

    await useAuthStore.getState().login('bad@email.com', 'wrong');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid credentials');
    expect(state.isLoading).toBe(false);
  });
});
