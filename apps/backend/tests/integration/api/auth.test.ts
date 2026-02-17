import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { JwtService } from '../../../src/infrastructure/security/jwt.service.js';
import { createAuthRoutes } from '../../../src/presentation/routes/auth.routes.js';
import { errorHandler } from '../../../src/presentation/middlewares/error-handler.middleware.js';

describe('Auth API', () => {
  let app: express.Express;
  let jwtService: JwtService;

  beforeAll(() => {
    jwtService = new JwtService('test-secret-that-is-at-least-32-characters-long-for-jwt');
    app = express();
    app.use(express.json());
    app.use(createAuthRoutes(jwtService));
    app.use(errorHandler);
  });

  describe('POST /auth/login', () => {
    it('should return 200 with token for valid admin credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@credit.com', password: 'admin123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@credit.com');
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should return 200 with token for valid analyst credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'analyst@credit.com', password: 'analyst123' })
        .expect(200);

      expect(res.body.data.user.role).toBe('analyst');
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@credit.com', password: 'wrong' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@credit.com', password: 'test' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 when email or password is missing', async () => {
      await request(app)
        .post('/auth/login')
        .send({ email: 'admin@credit.com' })
        .expect(401);

      await request(app)
        .post('/auth/login')
        .send({ password: 'admin123' })
        .expect(401);

      await request(app)
        .post('/auth/login')
        .send({})
        .expect(401);
    });

    it('should return a JWT that can be verified', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@credit.com', password: 'admin123' });

      const decoded = jwtService.verify(res.body.data.token);
      expect(decoded.email).toBe('admin@credit.com');
      expect(decoded.role).toBe('admin');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@credit.com', password: 'admin123' });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 when refresh token is missing', async () => {
      await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });
  });
});
