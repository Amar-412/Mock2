import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import userModel from '../src/models/user.model.js';
import sessionModel from '../src/models/session.model.js';
import jwt from 'jsonwebtoken';
import config from '../src/config/config.js';
import crypto from 'crypto';

test('AI Gateway Integration Tests', async (t) => {
  let studentToken, studentSession;
  let adminToken;

  await t.test('Setup DB and Users', async () => {
    await mongoose.connect(config.MONGO_URI);
    await userModel.deleteMany({});
    await sessionModel.deleteMany({});

    const student = await userModel.create({
      username: 'studentai',
      email: 'studentai@example.com',
      password: 'password',
      role: 'STUDENT',
      verified: true,
      isActive: true
    });

    const admin = await userModel.create({
      username: 'adminai',
      email: 'adminai@example.com',
      password: 'password',
      role: 'ADMIN',
      verified: true,
      isActive: true
    });

    studentSession = await sessionModel.create({
      user: student._id,
      refreshTokenHash: 'abc',
      ip: '127.0.0.1',
      userAgent: 'test'
    });
    studentToken = jwt.sign({ id: student._id, sessionId: studentSession._id }, config.JWT_SECRET, { expiresIn: '1h' });

    const adminSession = await sessionModel.create({
      user: admin._id,
      refreshTokenHash: 'def',
      ip: '127.0.0.1',
      userAgent: 'test'
    });
    adminToken = jwt.sign({ id: admin._id, sessionId: adminSession._id }, config.JWT_SECRET, { expiresIn: '1h' });
  });

  const originalFetch = global.fetch;

  await t.test('Unauthenticated user cannot call /api/ai/chat', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Hello' });
    
    assert.equal(res.status, 401);
  });

  await t.test('Empty message is rejected', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: '   ' });
    
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Message is required/);
  });

  await t.test('Invalid history format is rejected', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'Hello', history: 'not an array' });
    
    assert.equal(res.status, 400);
    assert.match(res.body.message, /History must be an array/);
  });

  await t.test('Invalid history role is rejected', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ 
        message: 'Hello', 
        history: [{ role: 'system', content: 'hack' }] 
      });
    
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Invalid history role/);
  });

  await t.test('Successful AI Response', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ success: true, answer: 'I am the AI response' })
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'What is Ecolympics?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.answer, 'I am the AI response');
  });

  await t.test('Python Service Unavailable', async () => {
    global.fetch = async () => {
      throw new Error('fetch failed');
    };

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'Hello' });

    assert.equal(res.status, 500);
    assert.match(res.body.message, /AI Service Error: AI service error/);
  });

  await t.test('Python Service Timeout', async () => {
    global.fetch = async () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    };

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'Hello' });

    assert.equal(res.status, 504);
    assert.match(res.body.message, /timed out/);
  });

  await t.test('Teardown', async () => {
    global.fetch = originalFetch;
    await mongoose.connection.close();
  });
});
