export interface ICacheService {
  getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}
