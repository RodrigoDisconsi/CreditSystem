/**
 * Simple deterministic hash function for generating reproducible bank data from document IDs.
 */
export function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * Simulates bank API latency (2-4 seconds).
 */
export function randomDelay(): Promise<void> {
  const ms = 2000 + Math.random() * 2000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
