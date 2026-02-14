import { Request, Response, NextFunction } from 'express';

export interface HandleBankWebhookUseCase {
  execute(data: unknown): Promise<unknown>;
}

export class WebhookController {
  constructor(
    private readonly handleBankWebhookUseCase: HandleBankWebhookUseCase,
  ) {}

  handleBankNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.handleBankWebhookUseCase.execute(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
