import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import http from 'http';
import { io as Client } from 'socket.io-client';
import fs from 'fs/promises';
import path from 'path';

import app from '../src/app.js';
import connectDB from '../src/config/database.js';
import { initSocketIO } from '../src/sockets/index.js';
import config from '../src/config/config.js';

import userModel from '../src/models/user.model.js';
import College from '../src/models/college.model.js';
import Event from '../src/models/event.model.js';
import Team from '../src/models/team.model.js';
import TeamMembership from '../src/models/teamMembership.model.js';
import ChatMessage from '../src/models/chatMessage.model.js';

let server;
let ioServer;
let adminToken;
let studentAToken;
let studentBToken; // different team
let studentCToken; // different event
let event1Id, event2Id;
let team1Id, team2Id, team3Id;
let studentA, studentB, studentC;

test.before(async () => {
  await connectDB();
  server = http.createServer(app);
  ioServer = initSocketIO(server);
  app.set('io', ioServer);

  // We MUST listen on a port for socket.io-client to connect
  await new Promise((resolve) => {
    server.listen(3001, resolve);
  });

  await mongoose.connection.dropDatabase();

  const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

  // Create Admin
  const admin = await userModel.create({ username: 'admin', email: 'admin@chat.com', password: hashPassword('password'), role: 'ADMIN', verified: true, isActive: true });
  const adminRes = await request(app).post('/api/auth/login').set('User-Agent', 'supertest').send({ email: 'admin@chat.com', password: 'password' });
  adminToken = adminRes.body.accessToken;

  // Colleges
  const college = await College.create({ name: 'Chat College', code: 'CHAT', location: 'Test' });

  // Events
  const ev1 = await request(app).post('/api/admin/events').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Event 1', type: 'LOCAL', status: 'PUBLISHED', startDate: new Date(), endDate: new Date(Date.now() + 86400000) });
  event1Id = ev1.body.data._id;
  const ev2 = await request(app).post('/api/admin/events').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Event 2', type: 'LOCAL', status: 'PUBLISHED', startDate: new Date(), endDate: new Date(Date.now() + 86400000) });
  event2Id = ev2.body.data._id;

  // Students
  studentA = await userModel.create({ username: 'studentA', email: 'a@chat.com', password: hashPassword('password'), role: 'STUDENT', collegeId: college._id, verified: true, isActive: true });
  const resA = await request(app).post('/api/auth/login').set('User-Agent', 'supertest').send({ email: 'a@chat.com', password: 'password' });
  studentAToken = resA.body.accessToken;

  studentB = await userModel.create({ username: 'studentB', email: 'b@chat.com', password: hashPassword('password'), role: 'STUDENT', collegeId: college._id, verified: true, isActive: true });
  const resB = await request(app).post('/api/auth/login').set('User-Agent', 'supertest').send({ email: 'b@chat.com', password: 'password' });
  studentBToken = resB.body.accessToken;

  studentC = await userModel.create({ username: 'studentC', email: 'c@chat.com', password: hashPassword('password'), role: 'STUDENT', collegeId: college._id, verified: true, isActive: true });
  const resC = await request(app).post('/api/auth/login').set('User-Agent', 'supertest').send({ email: 'c@chat.com', password: 'password' });
  studentCToken = resC.body.accessToken;

  // Teams & Memberships
  // Team 1 (Event 1) -> Student A
  const t1 = await Team.create({ eventId: event1Id, name: 'Team 1', collegeId: college._id, captainId: studentA._id, status: 'REGISTERED' });
  team1Id = t1._id;
  await TeamMembership.create({ eventId: event1Id, teamId: team1Id, userId: studentA._id, role: 'CAPTAIN', status: 'REGISTERED' });

  // Team 2 (Event 1) -> Student B
  const t2 = await Team.create({ eventId: event1Id, name: 'Team 2', collegeId: college._id, captainId: studentB._id, status: 'REGISTERED' });
  team2Id = t2._id;
  await TeamMembership.create({ eventId: event1Id, teamId: team2Id, userId: studentB._id, role: 'CAPTAIN', status: 'REGISTERED' });

  // Team 3 (Event 2) -> Student C
  const t3 = await Team.create({ eventId: event2Id, name: 'Team 3', collegeId: college._id, captainId: studentC._id, status: 'REGISTERED' });
  team3Id = t3._id;
  await TeamMembership.create({ eventId: event2Id, teamId: team3Id, userId: studentC._id, role: 'CAPTAIN', status: 'REGISTERED' });
});

test.after(async () => {
  server.close();
  await mongoose.connection.close();
  try {
    await fs.rm(config.CHAT_STORAGE, { recursive: true, force: true });
  } catch(e) {}
});

test('Chat Feature E2E', { concurrency: false }, async (t) => {

  await t.test('REST: Member sends text message', async () => {
    const res = await request(app)
      .post(`/api/chat/teams/${team1Id}/messages`)
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ type: 'TEXT', message: 'Hello Team 1!' });
    
    assert.equal(res.status, 201);
    assert.equal(res.body.data.message, 'Hello Team 1!');
  });

  await t.test('REST: Non-member denied sending text message (cross-team)', async () => {
    const res = await request(app)
      .post(`/api/chat/teams/${team1Id}/messages`)
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({ type: 'TEXT', message: 'Intruder!' });
    
    assert.equal(res.status, 403);
  });

  await t.test('REST: Non-member denied retrieving messages (cross-event)', async () => {
    const res = await request(app)
      .get(`/api/chat/teams/${team1Id}/messages`)
      .set('Authorization', `Bearer ${studentCToken}`);
    
    assert.equal(res.status, 403);
  });

  let messageIdWithMedia;
  await t.test('REST: Member uploads image message', async () => {
    const fakeImageBuffer = Buffer.from('fake image content');
    const res = await request(app)
      .post(`/api/chat/teams/${team1Id}/messages`)
      .set('Authorization', `Bearer ${studentAToken}`)
      .field('type', 'IMAGE')
      .field('message', 'Look at this photo')
      .attach('file', fakeImageBuffer, 'test.jpg');
    
    assert.equal(res.status, 201);
    assert.ok(res.body.data.file.filename);
    assert.equal(res.body.data.type, 'IMAGE');
    messageIdWithMedia = res.body.data.id;
  });

  await t.test('REST: Member retrieves media', async () => {
    const res = await request(app)
      .get(`/api/chat/messages/${messageIdWithMedia}/media`)
      .set('Authorization', `Bearer ${studentAToken}`);
    
    assert.equal(res.status, 200);
    assert.equal(res.body.toString(), 'fake image content');
  });

  await t.test('REST: Admin retrieves media', async () => {
    const res = await request(app)
      .get(`/api/chat/messages/${messageIdWithMedia}/media`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    assert.equal(res.status, 200);
  });

  await t.test('Socket.IO: Authenticate and Send Message', async () => {
    return new Promise((resolve, reject) => {
      const clientSocket = Client('http://localhost:3001', {
        auth: { token: studentAToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join_team_chat', { teamId: team1Id.toString() });
      });

      clientSocket.on('new_message', (msg) => {
        if (msg.message === 'Realtime WS msg!') {
          clientSocket.disconnect();
          resolve();
        }
      });

      clientSocket.on('connect_error', (err) => {
        console.error('SOCKET ERROR', err.message);
        reject(new Error('Connection error: ' + err.message));
      });

      clientSocket.on('error', (err) => {
        reject(new Error(err.message));
      });

      setTimeout(() => {
        clientSocket.emit('send_message', { type: 'TEXT', message: 'Realtime WS msg!' });
      }, 500);
    });
  });

  await t.test('Socket.IO: Non-member cannot send messages to room', async () => {
    return new Promise((resolve, reject) => {
      const clientB = Client('http://localhost:3001', {
        auth: { token: studentBToken }
      });

      clientB.on('connect', () => {
        clientB.emit('join_team_chat', { teamId: team1Id.toString() });
      });

      clientB.on('error', (err) => {
        if (err.message && err.message.includes('Forbidden')) {
          clientB.disconnect();
          resolve();
        }
      });

      setTimeout(() => {
        // Fallback resolve if server just silently ignored
        // Actually our backend emits 'error'
        reject(new Error('Did not receive forbidden error'));
      }, 500);
    });
  });
});
