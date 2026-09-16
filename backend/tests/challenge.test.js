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
import activityModel from '../src/models/activity.model.js';

describe('Phase 4: Events & Challenges Domain Integration Tests', () => {
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
      title: custom.title || `Ecolympics Event ${rand}`,
      slug: custom.slug || `ecolympics-event-${rand}`,
      description: custom.description || 'Campus Sustainability Challenge',
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
      title: custom.title || `Challenge ${rand}`,
      slug: custom.slug || `challenge-${rand}`,
      description: custom.description || 'Sustainability action track',
      track: custom.track || 'Waste',
      instructions: custom.instructions || 'Collect and segregate recyclable waste.',
      submissionRequirements: custom.submissionRequirements || {
        minEvidenceCount: 1,
        allowedEvidenceTypes: ['IMAGE', 'PDF'],
      },
      quantitativeFields: custom.quantitativeFields || [
        { key: 'waste_kg', label: 'Waste collected in kg', unit: 'kg', required: true },
      ],
      status: custom.status || 'ACTIVE',
    });
  };

  // Helper to create team
  const createTestTeam = async (lead, event, custom = {}) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return await teamModel.create({
      name: custom.name || `Eco Team ${rand}`,
      eventId: event._id,
      createdBy: lead.user._id,
      status: custom.status || 'FINALIZED',
      members: [
        {
          user: lead.user._id,
          role: 'LEAD',
          status: 'ACTIVE',
        },
      ],
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. EVENT DOMAIN TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Event Domain Endpoints', () => {
    it('should retrieve list of active events with pagination and filtering', async () => {
      const publicEvent = await createTestEvent({ visibility: 'PUBLIC' });
      const privateEvent = await createTestEvent({ visibility: 'PRIVATE' });

      const res = await request(app).get('/api/events');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.events));
      assert.ok(res.body.data.events.some((e) => e._id.toString() === publicEvent._id.toString()));

      // Filter by visibility
      const filteredRes = await request(app).get('/api/events?visibility=PRIVATE');
      assert.strictEqual(filteredRes.status, 200);
      assert.ok(filteredRes.body.data.events.some((e) => e._id.toString() === privateEvent._id.toString()));
    });

    it('should retrieve event details by ID', async () => {
      const event = await createTestEvent({ title: 'Energy Innovation Cup' });
      const res = await request(app).get(`/api/events/${event._id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.event.title, 'Energy Innovation Cup');
      assert.strictEqual(res.body.data.event.organizer, 'YUWA Foundation');
    });

    it('should return 404 for non-existent or inactive event', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/events/${fakeId}`);
      assert.strictEqual(res.status, 404);
      assert.match(res.body.message, /not found/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CHALLENGE DOMAIN & CATALOG TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Challenge Catalog & Multiple Tracks', () => {
    it('should list challenges for an event across multiple configurable tracks', async () => {
      const event = await createTestEvent();
      const wasteChallenge = await createTestChallenge(event._id, {
        title: 'Zero Waste Campus',
        track: 'Waste',
      });
      const energyChallenge = await createTestChallenge(event._id, {
        title: 'Dorm Energy Reduction',
        track: 'Energy',
      });
      const waterChallenge = await createTestChallenge(event._id, {
        title: 'Rainwater Harvesting Audit',
        track: 'Water',
      });

      // Get all challenges for event
      const res = await request(app).get(`/api/events/${event._id}/challenges`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.challenges.length, 3);

      // Filter by track=Waste
      const wasteRes = await request(app).get(`/api/events/${event._id}/challenges?track=Waste`);
      assert.strictEqual(wasteRes.status, 200);
      assert.strictEqual(wasteRes.body.data.challenges.length, 1);
      assert.strictEqual(wasteRes.body.data.challenges[0].title, 'Zero Waste Campus');

      // Filter by track=Energy
      const energyRes = await request(app).get(`/api/events/${event._id}/challenges?track=Energy`);
      assert.strictEqual(energyRes.status, 200);
      assert.strictEqual(energyRes.body.data.challenges.length, 1);
      assert.strictEqual(energyRes.body.data.challenges[0].title, 'Dorm Energy Reduction');
    });

    it('should retrieve a single challenge by ID with populated event', async () => {
      const event = await createTestEvent({ title: 'National Climate Bowl' });
      const challenge = await createTestChallenge(event._id, {
        title: 'Carbon Footprint Analysis',
        track: 'Climate Action',
      });

      const res = await request(app).get(`/api/challenges/${challenge._id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.challenge.title, 'Carbon Footprint Analysis');
      assert.strictEqual(res.body.data.challenge.track, 'Climate Action');
      assert.strictEqual(res.body.data.challenge.eventId.title, 'National Climate Bowl');
    });

    it('should return 404 for invalid challenge ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/challenges/${fakeId}`);
      assert.strictEqual(res.status, 404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TEAM ↔ CHALLENGE PARTICIPATION WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Team Challenge Participation Workflow', () => {
    it('should allow team to join a challenge and record CHALLENGE_JOINED activity', async () => {
      const lead = await registerStudent('JoinLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challenge = await createTestChallenge(event._id, { track: 'Water' });

      const res = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.participation.status, 'JOINED');

      // Verify in DB
      const dbParticipation = await teamChallengeModel.findOne({
        teamId: team._id,
        challengeId: challenge._id,
      });
      assert.ok(dbParticipation);
      assert.strictEqual(dbParticipation.status, 'JOINED');

      // Verify domain activity event was logged
      const activity = await activityModel.findOne({
        type: 'CHALLENGE_JOINED',
        teamId: team._id,
        actorId: lead.user._id,
      });
      assert.ok(activity);
      assert.strictEqual(activity.metadata.track, 'Water');
    });

    it('should support multiple challenges per team within the same event', async () => {
      const lead = await registerStudent('MultiTrackLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challengeA = await createTestChallenge(event._id, { track: 'Waste' });
      const challengeB = await createTestChallenge(event._id, { track: 'Energy' });

      // Join Challenge A
      const resA = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challengeA._id });
      assert.strictEqual(resA.status, 201);

      // Join Challenge B
      const resB = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challengeB._id });
      assert.strictEqual(resB.status, 201);

      // Verify team is participating in both challenges
      const listRes = await request(app)
        .get(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.body.data.count, 2);
    });

    it('should reject duplicate participation with 409 Conflict', async () => {
      const lead = await registerStudent('DupLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challenge = await createTestChallenge(event._id);

      // First join
      const res1 = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });
      assert.strictEqual(res1.status, 201);

      // Duplicate join attempt
      const res2 = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });

      assert.strictEqual(res2.status, 409);
      assert.match(res2.body.message, /already participating/i);
    });

    it('should reject joining a challenge belonging to another event with 400 Bad Request', async () => {
      const lead = await registerStudent('CrossEventLead');
      const eventA = await createTestEvent({ title: 'Event A' });
      const eventB = await createTestEvent({ title: 'Event B' });

      const team = await createTestTeam(lead, eventA);
      const challengeOfOtherEvent = await createTestChallenge(eventB._id);

      const res = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challengeOfOtherEvent._id });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /does not belong to the event/i);
    });

    it('should reject unauthorized cross-team access with 403 Forbidden', async () => {
      const leadA = await registerStudent('LeadA');
      const studentB = await registerStudent('StudentB');
      const event = await createTestEvent();
      const teamA = await createTestTeam(leadA, event);
      const challenge = await createTestChallenge(event._id);

      // Student B (not a member of Team A) tries to join challenge on behalf of Team A
      const res = await request(app)
        .post(`/api/teams/${teamA._id}/challenges`)
        .set('Authorization', `Bearer ${studentB.token}`)
        .send({ challengeId: challenge._id });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /Access denied/i);
    });

    it('should allow team lead to withdraw from a challenge when no work has been submitted', async () => {
      const lead = await registerStudent('WithdrawLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challenge = await createTestChallenge(event._id);

      // Join challenge
      await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });

      // Withdraw from challenge
      const withdrawRes = await request(app)
        .delete(`/api/teams/${team._id}/challenges/${challenge._id}`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(withdrawRes.status, 200);
      assert.strictEqual(withdrawRes.body.data.participation.status, 'WITHDRAWN');

      // Participation listing should now exclude withdrawn challenge
      const listRes = await request(app)
        .get(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(listRes.body.data.count, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SUBMISSION INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Submission ↔ Challenge Participation Validation', () => {
    it('should allow submission when team has actively joined the challenge', async () => {
      const lead = await registerStudent('SubmitParticipatingLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challenge = await createTestChallenge(event._id, { track: 'Energy' });

      // 1. Join challenge first
      await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });

      // 2. Submit against the joined challenge
      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Successfully implemented energy sensors across labs.',
          quantitativeData: { kwh_saved: 420 },
        });

      assert.strictEqual(subRes.status, 201);
      assert.strictEqual(subRes.body.success, true);
      assert.strictEqual(subRes.body.data.submission.status, 'DRAFT');
    });

    it('should reject submission if team has not joined the challenge', async () => {
      const lead = await registerStudent('UnregisteredSubmitLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challenge = await createTestChallenge(event._id, { track: 'Waste' });

      // Team did NOT join challenge
      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Attempting to submit without joining challenge',
        });

      assert.strictEqual(subRes.status, 400);
      assert.match(subRes.body.message, /not participating in this challenge/i);
    });

    it('should prevent team from withdrawing from a challenge after work is submitted', async () => {
      const lead = await registerStudent('NoWithdrawLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, event);
      const challenge = await createTestChallenge(event._id);

      // 1. Join challenge
      await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });

      // 2. Create submission and submit it
      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'Finalized solar audit report.',
        });

      const submissionId = subRes.body.data.submission._id;
      await request(app)
        .post(`/api/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${lead.token}`);

      // 3. Try to withdraw from challenge
      const withdrawRes = await request(app)
        .delete(`/api/teams/${team._id}/challenges/${challenge._id}`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(withdrawRes.status, 400);
      assert.match(withdrawRes.body.message, /Cannot leave challenge after submitting work/i);
    });
  });
});
