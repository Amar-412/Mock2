import '../src/config/polyfill.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';

describe('Health & Middleware Foundation Tests', () => {
  it('GET /api/health should return 200 with API status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /API is running/);
    assert.ok(res.body.timestamp);
  });

  it('GET /api/unregistered-path should return 404 with AppError payload', async () => {
    const res = await request(app).get('/api/unregistered-path');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /not found/i);
  });
});
