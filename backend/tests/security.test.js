import '../src/config/polyfill.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import userModel from '../src/models/user.model.js';
import teamModel from '../src/models/team.model.js';
import eventModel from '../src/models/event.model.js';
import challengeModel from '../src/models/challenge.model.js';
import teamChallengeModel from '../src/models/teamChallenge.model.js';
import submissionModel from '../src/models/submission.model.js';
import eventRegistrationModel from '../src/models/eventRegistration.model.js';
import notificationModel from '../src/models/notification.model.js';

describe('Phase 6: Security, Student Profile & Production Hardening Integration Tests', () => {
  let dbConnection;

  before(async () => {
    const testUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/yuwa_ecolympics_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testUri);
    }
    dbConnection = mongoose.connection;
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  // Helper to register student
  const registerStudent = async (namePrefix) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const studentData = {
      name: `${namePrefix} Student`,
      username: `${namePrefix.toLowerCase()}_${rand}`,
      email: `${namePrefix.toLowerCase()}_${rand}@college.edu`,
      password: 'StrongPassword123!',
      phone: '9876543210',
    };

    const res = await request(app).post('/api/auth/register').send(studentData);
    assert.strictEqual(res.status, 201, `Failed to register ${namePrefix}`);
    return {
      user: res.body.data.user,
      token: res.body.data.accessToken,
    };
  };

  // Helper to create an active competition event
  const createTestEvent = async (custom = {}) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return await eventModel.create({
      title: custom.title || `Security Event ${rand}`,
      slug: custom.slug || `security-event-${rand}`,
      description: custom.description || 'Security testing event',
      status: custom.status || 'REGISTRATION_OPEN',
      visibility: custom.visibility || 'PUBLIC',
      organizer: custom.organizer || 'YUWA Foundation',
      teamSize: custom.teamSize || { min: 2, max: 5 },
      isActive: custom.isActive !== undefined ? custom.isActive : true,
    });
  };

  // Helper to create challenge
  const createTestChallenge = async (eventId, custom = {}) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return await challengeModel.create({
      eventId,
      title: custom.title || `Security Challenge ${rand}`,
      slug: custom.slug || `security-challenge-${rand}`,
      description: custom.description || 'Sustainability action track',
      track: custom.track || 'Waste',
      instructions: custom.instructions || 'Collect recyclable waste.',
      submissionRequirements: custom.submissionRequirements || {
        minEvidenceCount: 1,
        allowedEvidenceTypes: ['IMAGE', 'PDF'],
      },
      quantitativeFields: custom.quantitativeFields || [],
      status: custom.status || 'ACTIVE',
    });
  };

  // Helper to create team
  const createTestTeam = async (lead, member, event, custom = {}) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const members = [
      {
        user: lead.user._id,
        role: 'LEAD',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    ];
    if (member) {
      members.push({
        user: member.user._id,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    }

    return await teamModel.create({
      name: custom.name || `Security Team ${rand}`,
      eventId: event._id,
      createdBy: lead.user._id,
      status: custom.status || 'FINALIZED',
      members,
    });
  };

  describe('1. Student Profile (GET & PATCH /api/users/me)', () => {
    it('allows an authenticated student to retrieve their profile without exposing password', async () => {
      const student = await registerStudent('ProfGet');

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user._id, student.user._id.toString());
      assert.strictEqual(res.body.data.user.email, student.user.email);
      assert.strictEqual(res.body.data.user.password, undefined);
    });

    it('allows student to update their profile info and social links', async () => {
      const student = await registerStudent('ProfUpdate');

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          bio: 'Passionate about environmental engineering.',
          department: 'Computer Science',
          yearOfStudy: 3,
          skills: ['Solar Energy', 'Data Analysis'],
          socialLinks: {
            linkedin: 'https://linkedin.com/in/ecostudent',
            github: 'https://github.com/ecostudent',
          },
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const user = res.body.data.user;
      assert.strictEqual(user.bio, 'Passionate about environmental engineering.');
      assert.strictEqual(user.department, 'Computer Science');
      assert.strictEqual(user.yearOfStudy, 3);
      assert.deepStrictEqual(user.skills, ['Solar Energy', 'Data Analysis']);
      assert.strictEqual(user.socialLinks.linkedin, 'https://linkedin.com/in/ecostudent');
    });

    it('rejects duplicate username when updating profile with 409 Conflict', async () => {
      const studentA = await registerStudent('ProfUserA');
      const studentB = await registerStudent('ProfUserB');

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${studentB.token}`)
        .send({ username: studentA.user.username });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
    });

    it('prevents privilege escalation (role tampering) via profile update', async () => {
      const student = await registerStudent('ProfEscalate');

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ role: 'ADMIN', verified: true });

      assert.strictEqual(res.status, 200);
      // Role must remain STUDENT
      const checkUser = await userModel.findById(student.user._id);
      assert.strictEqual(checkUser.role, 'STUDENT');
    });
  });

  describe('2. Event Registration (POST & GET /api/events/:eventId/register)', () => {
    it('allows team lead to register team for an event', async () => {
      const lead = await registerStudent('RegLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      const res = await request(app)
        .post(`/api/events/${event._id}/register`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ teamId: team._id, notes: 'Excited to compete!' });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.registration.team, team._id.toString());
      assert.strictEqual(res.body.data.registration.status, 'CONFIRMED');
    });

    it('prevents duplicate event registration for the same team with 409', async () => {
      const lead = await registerStudent('RegDupLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      // First registration
      await request(app)
        .post(`/api/events/${event._id}/register`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ teamId: team._id });

      // Second registration attempt
      const res = await request(app)
        .post(`/api/events/${event._id}/register`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ teamId: team._id });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects event registration if registering user is not the team lead', async () => {
      const lead = await registerStudent('RegOwnerLead');
      const member = await registerStudent('RegMember');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, member, event);

      const res = await request(app)
        .post(`/api/events/${event._id}/register`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({ teamId: team._id });

      assert.strictEqual(res.status, 403);
    });

    it('retrieves event registration status via GET /api/events/:eventId/registration', async () => {
      const lead = await registerStudent('RegCheckLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      await request(app)
        .post(`/api/events/${event._id}/register`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ teamId: team._id });

      const res = await request(app)
        .get(`/api/events/${event._id}/registration?teamId=${team._id}`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isRegistered, true);
      assert.ok(res.body.data.registration);
    });
  });

  describe('3. Team Lifecycle Hardening & Disbanding', () => {
    it('allows team lead to disband a team (POST /api/teams/:teamId/disband)', async () => {
      const lead = await registerStudent('DisbandLead');
      const member = await registerStudent('DisbandMember');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, member, event);

      const res = await request(app)
        .post(`/api/teams/${team._id}/disband`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'DISBANDED');

      // Member receives TEAM_DISBANDED notification
      const notif = await notificationModel.findOne({
        recipient: member.user._id,
        type: 'TEAM_DISBANDED',
      });
      assert.ok(notif);
    });

    it('rejects non-lead from disbanding the team with 403', async () => {
      const lead = await registerStudent('DisbandLead2');
      const member = await registerStudent('DisbandMember2');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, member, event);

      const res = await request(app)
        .post(`/api/teams/${team._id}/disband`)
        .set('Authorization', `Bearer ${member.token}`);

      assert.strictEqual(res.status, 403);
    });

    it('blocks disbanded team from joining challenges or creating submissions', async () => {
      const lead = await registerStudent('DisbandLead3');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const team = await createTestTeam(lead, null, event, { status: 'DISBANDED' });

      // Attempt to join challenge
      const joinRes = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });
      assert.strictEqual(joinRes.status, 400);

      // Attempt to create submission
      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Disbanded attempt',
        });
      assert.strictEqual(subRes.status, 400);
    });
  });

  describe('4. Offline Sync Hardening & IDOR Protection', () => {
    it('is idempotent on repeated sync requests with same clientSubmissionId', async () => {
      const lead = await registerStudent('SyncIdemLead');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const team = await createTestTeam(lead, null, event);

      await teamChallengeModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId: challenge._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      const clientSubmissionId = `sync_offline_${Date.now()}`;

      // First sync call
      const res1 = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          clientSubmissionId,
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'First offline sync',
        });
      assert.strictEqual(res1.status, 201);
      assert.strictEqual(res1.body.data.isExisting, false);

      // Second sync call (retry)
      const res2 = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          clientSubmissionId,
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'First offline sync duplicate',
        });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.data.isExisting, true);
      assert.strictEqual(res2.body.data.submission._id, res1.body.data.submission._id);

      // Verify no duplicate submission documents in DB
      const count = await submissionModel.countDocuments({ clientSubmissionId });
      assert.strictEqual(count, 1);
    });

    it('blocks Student from Team B from querying/syncing Team A clientSubmissionId with 403 (IDOR prevention)', async () => {
      const leadA = await registerStudent('SyncTeamALead');
      const leadB = await registerStudent('SyncTeamBLead');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const teamA = await createTestTeam(leadA, null, event);
      const teamB = await createTestTeam(leadB, null, event);

      await teamChallengeModel.create({
        teamId: teamA._id,
        eventId: event._id,
        challengeId: challenge._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      const clientSubmissionId = `sync_teamA_secret_${Date.now()}`;

      // Team A creates submission
      await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${leadA.token}`)
        .send({
          clientSubmissionId,
          teamId: teamA._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Team A secret draft',
        });

      // Team B tries to sync / probe Team A's clientSubmissionId
      const probeRes = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${leadB.token}`)
        .send({
          clientSubmissionId,
        });

      assert.strictEqual(probeRes.status, 403);
      assert.strictEqual(probeRes.body.success, false);
    });

    it('rejects sync with malformed ObjectId parameters with 400', async () => {
      const lead = await registerStudent('SyncBadIdLead');

      const res = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          clientSubmissionId: `bad_id_${Date.now()}`,
          teamId: 'invalid-mongodb-id',
          eventId: 'invalid-event-id',
          challengeId: 'invalid-challenge-id',
        });

      assert.strictEqual(res.status, 400);
    });
  });

  describe('5. Cross-Tenant IDOR & Evidence Security', () => {
    it('blocks Student A from accessing Student B draft submission', async () => {
      const leadA = await registerStudent('IdorLeadA');
      const leadB = await registerStudent('IdorLeadB');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const teamA = await createTestTeam(leadA, null, event);
      const teamB = await createTestTeam(leadB, null, event);

      await teamChallengeModel.create({
        teamId: teamA._id,
        eventId: event._id,
        challengeId: challenge._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      // Create draft submission for team A
      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${leadA.token}`)
        .send({
          teamId: teamA._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Team A Private Submission',
        });

      const submissionId = subRes.body.data.submission._id;

      // Student B attempts to access Team A submission
      const probeRes = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${leadB.token}`);

      assert.strictEqual(probeRes.status, 403);
    });

    it('blocks Student A from uploading evidence to Student B submission', async () => {
      const leadA = await registerStudent('EvidLeadA');
      const leadB = await registerStudent('EvidLeadB');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const teamA = await createTestTeam(leadA, null, event);

      await teamChallengeModel.create({
        teamId: teamA._id,
        eventId: event._id,
        challengeId: challenge._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${leadA.token}`)
        .send({
          teamId: teamA._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Team A Submission',
        });

      assert.strictEqual(subRes.status, 201, `Failed to create submission: ${JSON.stringify(subRes.body)}`);
      const submissionId = subRes.body.data.submission._id;

      // Lead B attempts to upload evidence to Team A's submission
      const probeRes = await request(app)
        .post(`/api/submissions/${submissionId}/evidence`)
        .set('Authorization', `Bearer ${leadB.token}`)
        .attach('file', Buffer.from('fake image content'), 'test.jpg');

      assert.strictEqual(probeRes.status, 403);
    });
  });
});
