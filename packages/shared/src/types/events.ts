import type { Application, ApplicationStatus } from './application.js';

export type WebSocketEventType =
  | 'application:created'
  | 'application:updated'
  | 'application:status-changed'
  | 'application:risk-evaluated';

export interface ApplicationCreatedEvent {
  type: 'application:created';
  data: Application;
}

export interface ApplicationUpdatedEvent {
  type: 'application:updated';
  data: Application;
}

export interface ApplicationStatusChangedEvent {
  type: 'application:status-changed';
  data: {
    applicationId: string;
    oldStatus: ApplicationStatus;
    newStatus: ApplicationStatus;
    changedAt: string;
  };
}

export interface ApplicationRiskEvaluatedEvent {
  type: 'application:risk-evaluated';
  data: {
    applicationId: string;
    status: ApplicationStatus;
    riskScore?: number;
  };
}

export type WebSocketEvent =
  | ApplicationCreatedEvent
  | ApplicationUpdatedEvent
  | ApplicationStatusChangedEvent
  | ApplicationRiskEvaluatedEvent;
