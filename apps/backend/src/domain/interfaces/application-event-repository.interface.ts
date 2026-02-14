import { ApplicationEvent } from '../entities/application-event.entity.js';

export interface IApplicationEventRepository {
  create(event: ApplicationEvent): Promise<ApplicationEvent>;
  findByApplicationId(applicationId: string): Promise<ApplicationEvent[]>;
}
