import { randomUUID } from 'crypto';

export interface ApplicationEventProps {
  applicationId: string;
  eventType: string;
  eventData: Record<string, unknown>;
}

export class ApplicationEvent {
  readonly id: string;
  readonly applicationId: string;
  readonly eventType: string;
  readonly eventData: Record<string, unknown>;
  readonly createdAt: Date;

  private constructor(
    id: string,
    applicationId: string,
    eventType: string,
    eventData: Record<string, unknown>,
    createdAt: Date,
  ) {
    this.id = id;
    this.applicationId = applicationId;
    this.eventType = eventType;
    this.eventData = Object.freeze({ ...eventData });
    this.createdAt = createdAt;
  }

  static create(props: ApplicationEventProps): ApplicationEvent {
    return new ApplicationEvent(
      randomUUID(),
      props.applicationId,
      props.eventType,
      props.eventData,
      new Date(),
    );
  }
}
