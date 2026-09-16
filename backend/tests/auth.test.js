import '../src/config/polyfill.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import userModel from '../src/models/user.model.js';
import sessionModel from '../src/models/session.model.js';
import otpModel from '../src/models/otp.model.js';

describe('Auth & Session Foundation Integration Tests', () => {
  before(async () => {
    const testUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/yuwa_ecolympics_test';
    await mongoose.connect(testUri);
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  const createUniqueUser = () => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: 'Priya Patel',
      username: `priya_${rand}`,
      email: `priya_${rand}@test.com`,
      password: 'SecurePassword123!',
      phone: '9876543210',
    };
  };

  describe('POST /api/auth/register', () => {
    it('should register student, hash password with bcrypt, and issue tokens', async () => {
      const user = createUniqueUser();
      const res = await request(app).post('/api/auth/register').send(user);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.strictEqual(res.body.data.user.email, user.email);
      assert.strictEqual(res.body.data.user.password, undefined); // Never leak password

      // Refresh token must be in set-cookie header
      const cookies = res.headers['set-cookie'];
      assert.ok(cookies);
      assert.ok(cookies.some((c) => c.includes('refreshToken=')));

      // Session document must exist in database
      const dbSession = await sessionModel.findOne({ user: res.body.data.user._id });
      assert.ok(dbSession);
      assert.strictEqual(dbSession.revoked, false);
    });

    it('should reject duplicate registration with 409 Conflict', async () => {
      const user = createUniqueUser();
      await request(app).post('/api/auth/register').send(user);
      const res = await request(app).post('/api/auth/register').send(user);

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject passwords shorter than 8 characters with 400', async () => {
      const user = createUniqueUser();
      user.password = 'short';
      const res = await request(app).post('/api/auth/register').send(user);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user, set rotated cookie, and return access token', async () => {
      const user = createUniqueUser();
      await request(app).post('/api/auth/register').send(user);

      const res = await request(app).post('/api/auth/login').send({
        email: user.email,
        password: user.password,
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.strictEqual(res.body.data.user.email, user.email);
      assert.ok(res.headers['set-cookie']);
    });

    it('should reject incorrect password with 401', async () => {
      const user = createUniqueUser();
      await request(app).post('/api/auth/register').send(user);

      const res = await request(app).post('/api/auth/login').send({
        email: user.email,
        password: 'WrongPassword!',
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should return student profile when valid Bearer token is passed', async () => {
      const user = createUniqueUser();
      const reg = await request(app).post('/api/auth/register').send(user);
      const { accessToken } = reg.body.data;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.user.email, user.email);
      assert.strictEqual(res.body.data.user.password, undefined);
    });

    it('should reject request without Bearer token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should rotate refresh token and issue a new access token', async () => {
      const user = createUniqueUser();
      const loginRes = await request(app).post('/api/auth/register').send(user);
      const cookieHeader = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', cookieHeader);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.headers['set-cookie']); // New rotated cookie issued
    });

    it('should reject refresh without cookie with 401', async () => {
      const res = await request(app).post('/api/auth/refresh-token');
      assert.strictEqual(res.status, 401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke active session in database and clear cookie', async () => {
      const user = createUniqueUser();
      const reg = await request(app).post('/api/auth/register').send(user);
      const { accessToken } = reg.body.data;
      const cookieHeader = reg.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookieHeader);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Subsequent refresh attempt should be rejected because session is revoked
      const refreshRes = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', cookieHeader);

      assert.strictEqual(refreshRes.status, 401);
    });
  });
});
