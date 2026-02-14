import { Request, Response, NextFunction } from 'express';

export interface CreateApplicationUseCase {
  execute(data: unknown): Promise<{ id: string }>;
}

export interface GetApplicationUseCase {
  execute(id: string): Promise<unknown>;
}

export interface ListApplicationsUseCase {
  execute(filters: unknown): Promise<unknown>;
}

export interface UpdateStatusUseCase {
  execute(id: string, data: unknown): Promise<unknown>;
}

export class ApplicationController {
  constructor(
    private readonly createApplicationUseCase: CreateApplicationUseCase,
    private readonly getApplicationUseCase: GetApplicationUseCase,
    private readonly listApplicationsUseCase: ListApplicationsUseCase,
    private readonly updateStatusUseCase: UpdateStatusUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.createApplicationUseCase.execute(req.body);
      res.status(201).location(`/api/v1/applications/${result.id}`).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getApplicationUseCase.execute(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listApplicationsUseCase.execute(req.query as any);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.updateStatusUseCase.execute(req.params.id as string, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
