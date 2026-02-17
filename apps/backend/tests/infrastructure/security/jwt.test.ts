import { describe, it, expect } from 'vitest';
import { JwtService } from '../../../src/infrastructure/security/jwt.service.js';

describe('JwtService', () => {
  const secret = 'test-secret-that-is-at-least-32-characters-long-for-jwt';
  const service = new JwtService(secret, '1h', '7d');

  const payload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
  };

  describe('sign and verify', () => {
    it('should sign and verify a token', () => {
      const token = service.sign(payload);
      const decoded = service.verify(token);
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
    });

    it('should sign and verify a refresh token', () => {
      const token = service.signRefresh(payload);
      const decoded = service.verifyRefresh(token);
      expect(decoded.userId).toBe('user-123');
    });

    it('should reject refresh token when verified as access', () => {
      const token = service.signRefresh(payload);
      expect(() => service.verify(token)).toThrow('expected access token');
    });

    it('should reject access token when verified as refresh', () => {
      const token = service.sign(payload);
      expect(() => service.verifyRefresh(token)).toThrow('expected refresh token');
    });
  });

  describe('verification errors', () => {
    it('should throw on invalid token', () => {
      expect(() => service.verify('invalid-token')).toThrow();
    });

    it('should throw on token signed with different secret', () => {
      const otherService = new JwtService('other-secret-that-is-at-least-32-characters-long');
      const token = otherService.sign(payload);
      expect(() => service.verify(token)).toThrow();
    });

    it('should throw on expired token', () => {
      const shortService = new JwtService(secret, '0s');
      const token = shortService.sign(payload);
      expect(() => shortService.verify(token)).toThrow();
    });
  });
});
