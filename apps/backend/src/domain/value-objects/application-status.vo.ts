import type { ApplicationStatus } from '@credit-system/shared';
import { VALID_STATUS_TRANSITIONS } from '@credit-system/shared';

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'under_review',
  'approved',
  'rejected',
]);

export class ApplicationStatusVO {
  readonly value: ApplicationStatus;

  private constructor(value: ApplicationStatus) {
    this.value = value;
  }

  static create(value: string): ApplicationStatusVO {
    if (!VALID_STATUSES.has(value)) {
      throw new Error(
        `Invalid application status '${value}'. Must be one of: ${[...VALID_STATUSES].join(', ')}`,
      );
    }
    return new ApplicationStatusVO(value as ApplicationStatus);
  }

  canTransitionTo(target: ApplicationStatusVO): boolean {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[this.value];
    return allowedTransitions.includes(target.value);
  }

  equals(other: ApplicationStatusVO): boolean {
    return this.value === other.value;
  }
}
