import '../src/config/polyfill.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import userModel from '../src/models/user.model.js';
import teamModel from '../src/models/team.model.js';
import eventModel from '../src/models/event.model.js';
import submissionModel from '../src/models/submission.model.js';
import evidenceModel from '../src/models/evidence.model.js';
import activityModel from '../src/models/activity.model.js';

describe('Phase 3: Submissions + Evidence Storage & Activity Integration Tests', () => {
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
    assert.strictEqual(res.status, 201);
    return {
      user: res.body.data.user,
      token: res.body.data.accessToken,
    };
  };

  // Helper to create an active competition event
  const createTestEvent = async () => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return await eventModel.create({
      title: `Ecolympics Event ${rand}`,
      slug: `ecolympics-event-${rand}`,
      description: 'Campus Sustainability Challenge',
      status: 'REGISTRATION_OPEN',
      teamSize: { min: 2, max: 5 },
      isActive: true,
    });
  };

  // Helper to create a team with active lead
  const createTestTeam = async (student, event) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return await teamModel.create({
      name: `Team Eco ${rand}`,
      eventId: event._id,
      createdBy: student.user._id,
      status: 'DRAFT',
      members: [
        {
          user: student.user._id,
          role: 'LEAD',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      ],
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SUBMISSION CREATION & RETRIEVAL TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Submission Creation & Retrieval', () => {
    it('should reject unauthenticated submission creation with 401', async () => {
      const event = await createTestEvent();
      const mockChallengeId = new mongoose.Types.ObjectId();
      const mockTeamId = new mongoose.Types.ObjectId();

      const res = await request(app).post('/api/submissions').send({
        teamId: mockTeamId,
        eventId: event._id,
        challengeId: mockChallengeId,
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow active team member to create a draft submission and record activity', async () => {
      const student = await registerStudent('SubCreator');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Our team successfully recycled 50kg of plastic on campus.',
          quantitativeData: { metric: 'plastic_kg', value: 50 },
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.submission.status, 'DRAFT');
      assert.strictEqual(res.body.data.submission.teamId.toString(), team._id.toString());
      assert.match(res.body.data.submission.reflection, /50kg of plastic/);

      // Verify SUBMISSION_CREATED activity was recorded
      const activity = await activityModel.findOne({
        type: 'SUBMISSION_CREATED',
        teamId: team._id,
        actorId: student.user._id,
      });
      assert.ok(activity);
      assert.strictEqual(activity.type, 'SUBMISSION_CREATED');
    });

    it('should reject cross-team submission creation with 403 Forbidden', async () => {
      const member = await registerStudent('RealMember');
      const outsider = await registerStudent('Outsider');
      const event = await createTestEvent();
      const team = await createTestTeam(member, event);
      const challengeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Unauthorized submission attempt',
        });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /Access denied/i);
    });

    it('should allow team members to retrieve their submission and reject outsiders with 403', async () => {
      const member = await registerStudent('Reader');
      const outsider = await registerStudent('Spy');
      const event = await createTestEvent();
      const team = await createTestTeam(member, event);
      const challengeId = new mongoose.Types.ObjectId();

      const createRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Internal team notes',
        });

      const submissionId = createRes.body.data.submission._id;

      // Authorized retrieval
      const getRes = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${member.token}`);
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.body.data.submission._id.toString(), submissionId.toString());

      // Unauthorized retrieval
      const outsiderRes = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${outsider.token}`);
      assert.strictEqual(outsiderRes.status, 403);
      assert.match(outsiderRes.body.message, /Access denied/i);
    });

    it('should list all submissions for a team', async () => {
      const student = await registerStudent('TeamList');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);

      await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId: new mongoose.Types.ObjectId(),
          reflection: 'Challenge 1 progress',
        });

      const listRes = await request(app)
        .get(`/api/teams/${team._id}/submissions`)
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(listRes.status, 200);
      assert.ok(Array.isArray(listRes.body.data.submissions));
      assert.strictEqual(listRes.body.data.submissions.length, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. EVIDENCE UPLOAD & STORAGE TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Evidence File Uploads & Metadata Storage', () => {
    it('should upload an image artifact and persist metadata', async () => {
      const student = await registerStudent('ImageUploader');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ teamId: team._id, eventId: event._id, challengeId });
      const submissionId = subRes.body.data.submission._id;

      // Attach PNG image buffer
      const fakeImageBuffer = Buffer.from('fake-png-binary-content-12345');
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/evidence`)
        .set('Authorization', `Bearer ${student.token}`)
        .attach('file', fakeImageBuffer, 'audit_photo.png');

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.evidence.type, 'IMAGE');
      assert.strictEqual(res.body.data.evidence.originalName, 'audit_photo.png');
      assert.ok(res.body.data.evidence.url.startsWith('/uploads/'));

      // Verify DB persistence
      const dbEvidence = await evidenceModel.findById(res.body.data.evidence._id);
      assert.ok(dbEvidence);
      assert.strictEqual(dbEvidence.submissionId.toString(), submissionId.toString());
      assert.strictEqual(dbEvidence.mimeType, 'image/png');
    });

    it('should upload a PDF document and categorize type as PDF', async () => {
      const student = await registerStudent('PdfUploader');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ teamId: team._id, eventId: event._id, challengeId });
      const submissionId = subRes.body.data.submission._id;

      const fakePdfBuffer = Buffer.from('%PDF-1.4 fake pdf data');
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/evidence`)
        .set('Authorization', `Bearer ${student.token}`)
        .attach('file', fakePdfBuffer, 'report.pdf');

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.evidence.type, 'PDF');
      assert.strictEqual(res.body.data.evidence.mimeType, 'application/pdf');
    });

    it('should upload a video file and categorize type as VIDEO', async () => {
      const student = await registerStudent('VideoUploader');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ teamId: team._id, eventId: event._id, challengeId });
      const submissionId = subRes.body.data.submission._id;

      const fakeVideoBuffer = Buffer.from('fake-mp4-video-stream-bits');
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/evidence`)
        .set('Authorization', `Bearer ${student.token}`)
        .attach('file', fakeVideoBuffer, 'demo.mp4');

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.evidence.type, 'VIDEO');
      assert.strictEqual(res.body.data.evidence.mimeType, 'video/mp4');
    });

    it('should reject unsupported file types with 400 Bad Request', async () => {
      const student = await registerStudent('BadFile');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ teamId: team._id, eventId: event._id, challengeId });
      const submissionId = subRes.body.data.submission._id;

      const maliciousBuffer = Buffer.from('malicious-executable');
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/evidence`)
        .set('Authorization', `Bearer ${student.token}`)
        .attach('file', maliciousBuffer, 'exploit.exe');

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /not supported/i);
    });

    it('should reject evidence upload to an already submitted submission with 400', async () => {
      const student = await registerStudent('LockedUpload');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      // Create and submit submission
      const sub = await submissionModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId,
        submittedBy: student.user._id,
        status: 'SUBMITTED',
        reflection: 'Finished work',
      });

      const res = await request(app)
        .post(`/api/submissions/${sub._id}/evidence`)
        .set('Authorization', `Bearer ${student.token}`)
        .attach('file', Buffer.from('image'), 'late_evidence.png');

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /only DRAFT can be modified/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SUBMISSION LIFECYCLE & STATE TRANSITIONS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Submission Lifecycle (Submit & State Machine)', () => {
    it('should reject submitting an empty submission with 400', async () => {
      const student = await registerStudent('EmptySub');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const sub = await submissionModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId,
        submittedBy: student.user._id,
        status: 'DRAFT',
        reflection: '', // empty reflection
      });

      const res = await request(app)
        .post(`/api/submissions/${sub._id}/submit`)
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /Cannot submit an empty submission/i);
    });

    it('should transition DRAFT to SUBMITTED and record SUBMISSION_SUBMITTED activity', async () => {
      const student = await registerStudent('FinalSubmitter');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const sub = await submissionModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId,
        submittedBy: student.user._id,
        status: 'DRAFT',
        reflection: 'Comprehensive project reflection on energy conservation.',
      });

      const res = await request(app)
        .post(`/api/submissions/${sub._id}/submit`)
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.submission.status, 'SUBMITTED');
      assert.ok(res.body.data.submission.submittedAt);

      // Verify DB state
      const dbSub = await submissionModel.findById(sub._id);
      assert.strictEqual(dbSub.status, 'SUBMITTED');

      // Verify SUBMISSION_SUBMITTED activity was recorded
      const activity = await activityModel.findOne({
        type: 'SUBMISSION_SUBMITTED',
        teamId: team._id,
        actorId: student.user._id,
      });
      assert.ok(activity);
    });

    it('should reject submitting an already submitted submission with 400', async () => {
      const student = await registerStudent('DoubleSubmit');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();

      const sub = await submissionModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId,
        submittedBy: student.user._id,
        status: 'SUBMITTED',
        reflection: 'Done',
      });

      const res = await request(app)
        .post(`/api/submissions/${sub._id}/submit`)
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /already submitted/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. OFFLINE SYNCHRONIZATION & IDEMPOTENCY TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Offline Sync & Idempotency (/api/submissions/sync)', () => {
    it('should create new submission on first sync call', async () => {
      const student = await registerStudent('SyncNew');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();
      const clientSubmissionId = `client-uuid-${Date.now()}`;

      const res = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          clientSubmissionId,
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Offline gathered evidence and survey results',
          quantitativeData: { trees_planted: 25 },
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.isExisting, false);
      assert.strictEqual(res.body.data.submission.clientSubmissionId, clientSubmissionId);

      const dbSub = await submissionModel.findOne({ clientSubmissionId });
      assert.ok(dbSub);
    });

    it('should return existing submission without creating duplicates when same clientSubmissionId is sent twice', async () => {
      const student = await registerStudent('SyncRetry');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();
      const clientSubmissionId = `client-uuid-retry-${Date.now()}`;

      // First sync request
      const firstRes = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          clientSubmissionId,
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Original offline submission payload',
        });
      assert.strictEqual(firstRes.status, 201);
      const firstId = firstRes.body.data.submission._id;

      // Second sync request (network retry scenario)
      const secondRes = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          clientSubmissionId,
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Original offline submission payload',
        });

      assert.strictEqual(secondRes.status, 200);
      assert.strictEqual(secondRes.body.data.isExisting, true);
      assert.strictEqual(secondRes.body.data.submission._id.toString(), firstId.toString());

      // Confirm only 1 document exists in DB
      const count = await submissionModel.countDocuments({ clientSubmissionId });
      assert.strictEqual(count, 1, 'Only one submission document must exist for clientSubmissionId');
    });

    it('should support isFinalSubmit=true during sync', async () => {
      const student = await registerStudent('SyncFinal');
      const event = await createTestEvent();
      const team = await createTestTeam(student, event);
      const challengeId = new mongoose.Types.ObjectId();
      const clientSubmissionId = `client-final-${Date.now()}`;

      const res = await request(app)
        .post('/api/submissions/sync')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          clientSubmissionId,
          teamId: team._id,
          eventId: event._id,
          challengeId,
          reflection: 'Immediate final offline submission',
          isFinalSubmit: true,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.submission.status, 'SUBMITTED');

      // Verify activity recorded
      const activity = await activityModel.findOne({
        type: 'SUBMISSION_SUBMITTED',
        teamId: team._id,
      });
      assert.ok(activity);
    });
  });
});
