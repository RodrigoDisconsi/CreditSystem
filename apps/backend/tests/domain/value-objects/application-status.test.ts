import { describe, it, expect } from 'vitest';
import { ApplicationStatusVO } from '../../../src/domain/value-objects/application-status.vo.js';

describe('ApplicationStatusVO', () => {
  it('should create valid statuses', () => {
    expect(ApplicationStatusVO.create('pending').value).toBe('pending');
    expect(ApplicationStatusVO.create('under_review').value).toBe('under_review');
    expect(ApplicationStatusVO.create('approved').value).toBe('approved');
    expect(ApplicationStatusVO.create('rejected').value).toBe('rejected');
  });

  it('should throw for invalid status', () => {
    expect(() => ApplicationStatusVO.create('invalid')).toThrow('Invalid application status');
    expect(() => ApplicationStatusVO.create('')).toThrow('Invalid application status');
  });

  it('should validate transitions correctly', () => {
    const pending = ApplicationStatusVO.create('pending');
    const underReview = ApplicationStatusVO.create('under_review');
    const approved = ApplicationStatusVO.create('approved');
    const rejected = ApplicationStatusVO.create('rejected');

    expect(pending.canTransitionTo(underReview)).toBe(true);
    expect(pending.canTransitionTo(rejected)).toBe(true);
    expect(pending.canTransitionTo(approved)).toBe(true);

    expect(underReview.canTransitionTo(approved)).toBe(true);
    expect(underReview.canTransitionTo(rejected)).toBe(true);
    expect(underReview.canTransitionTo(pending)).toBe(false);

    expect(approved.canTransitionTo(pending)).toBe(false);
    expect(approved.canTransitionTo(rejected)).toBe(false);

    expect(rejected.canTransitionTo(pending)).toBe(false);
    expect(rejected.canTransitionTo(approved)).toBe(false);
  });

  it('should compare equality', () => {
    const s1 = ApplicationStatusVO.create('pending');
    const s2 = ApplicationStatusVO.create('pending');
    const s3 = ApplicationStatusVO.create('approved');
    expect(s1.equals(s2)).toBe(true);
    expect(s1.equals(s3)).toBe(false);
  });
});
