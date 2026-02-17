import { Request, Response, NextFunction } from 'express';
import type { CreateApplicationDto } from '../../application/dto/create-application.dto.js';
import type { UpdateStatusDto } from '../../application/dto/update-status.dto.js';
import type { ApplicationResponseDto } from '../../application/dto/application-response.dto.js';
import type { ApplicationFilters } from '@credit-system/shared';

export interface ICreateApplicationUseCase {
  execute(data: CreateApplicationDto): Promise<ApplicationResponseDto>;
}

export interface IGetApplicationUseCase {
  execute(id: string): Promise<ApplicationResponseDto>;
}

export interface IListApplicationsUseCase {
  execute(filters: ApplicationFilters): Promise<{ success: boolean; data: ApplicationResponseDto[]; pagination: unknown }>;
}

export interface IUpdateStatusUseCase {
  execute(id: string, data: UpdateStatusDto): Promise<ApplicationResponseDto>;
}

export class ApplicationController {
  constructor(
    private readonly createApplicationUseCase: ICreateApplicationUseCase,
    private readonly getApplicationUseCase: IGetApplicationUseCase,
    private readonly listApplicationsUseCase: IListApplicationsUseCase,
    private readonly updateStatusUseCase: IUpdateStatusUseCase,
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
      const result = await this.listApplicationsUseCase.execute(req.query as unknown as ApplicationFilters);
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
