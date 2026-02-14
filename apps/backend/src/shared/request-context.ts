import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

interface RequestContext {
  requestId: string;
  [key: string]: unknown;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? 'no-request-id';
}

export function createRequestContext(): RequestContext {
  return { requestId: randomUUID() };
}
