export interface IQueueService {
  enqueue(
    queueName: string,
    data: Record<string, unknown>,
    options?: { delay?: number; attempts?: number },
  ): Promise<void>;
}
