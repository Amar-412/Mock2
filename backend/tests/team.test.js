import '../src/config/polyfill.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import userModel from '../src/models/user.model.js';
import teamModel from '../src/models/team.model.js';
import eventModel from '../src/models/event.model.js';
import teamInvitationModel from '../src/models/teamInvitation.model.js';
import notificationModel from '../src/models/notification.model.js';

describe('Phase 2: Team Domain & Member Workflow Integration Tests', () => {
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

  // Helper to register student and return token + user info
  const registerStudent = async (namePrefix) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const studentData = {
      name: `${namePrefix} Sharma`,
      username: `${namePrefix.toLowerCase()}_${rand}`,
      email: `${namePrefix.toLowerCase()}_${rand}@college.edu`,
      password: 'StrongPassword123!',
      phone: '9876543210',
    };

    const res = await request(app).post('/api/auth/register').send(studentData);
    assert.strictEqual(res.status, 201, `Failed to register ${namePrefix}: ${JSON.stringify(res.body)}`);
    return {
      user: res.body.data.user,
      token: res.body.data.accessToken,
    };
  };

  // Helper to create an active competition event
  const createTestEvent = async (options = {}) => {
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return await eventModel.create({
      title: `Campus Ecolympics ${rand}`,
      slug: `campus-ecolympics-${rand}`,
      description: 'Annual inter-college sustainability hackathon',
      status: options.status || 'REGISTRATION_OPEN',
      registrationStartDate: options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      registrationEndDate: options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      teamSize: {
        min: options.minSize !== undefined ? options.minSize : 2,
        max: options.maxSize !== undefined ? options.maxSize : 3,
      },
      isActive: options.isActive !== undefined ? options.isActive : true,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TEAM CREATION & RETRIEVAL TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Team Creation & Member Roster Access', () => {
    it('should reject unauthenticated team creation with 401 Unauthorized', async () => {
      const event = await createTestEvent();
      const res = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .send({ name: 'EcoWarriors' });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should create team, assign creator as LEAD in members[], and embed membership', async () => {
      const student = await registerStudent('Aarav');
      const event = await createTestEvent();

      const res = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ name: 'Green Guardians' });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.team.name, 'Green Guardians');
      assert.strictEqual(res.body.data.team.status, 'DRAFT');
      assert.strictEqual(res.body.data.team.membersCount, 1);

      const creatorMember = res.body.data.team.members[0];
      assert.strictEqual(creatorMember.user.toString(), student.user._id.toString());
      assert.strictEqual(creatorMember.role, 'LEAD');
      assert.strictEqual(creatorMember.status, 'ACTIVE');
      assert.ok(creatorMember.joinedAt);

      // Verify DB state
      const dbTeam = await teamModel.findById(res.body.data.team._id);
      assert.ok(dbTeam);
      assert.strictEqual(dbTeam.members.length, 1);
      assert.strictEqual(dbTeam.members[0].role, 'LEAD');
    });

    it('should reject duplicate team creation for the same student in the same event with 409', async () => {
      const student = await registerStudent('Kavya');
      const event = await createTestEvent();

      // First team
      const res1 = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ name: 'Solar Pioneers' });
      assert.strictEqual(res1.status, 201);

      // Second team attempt in same event
      const res2 = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ name: 'Solar Pioneers 2' });
      assert.strictEqual(res2.status, 409);
      assert.match(res2.body.message, /already an active member/i);
    });

    it('should allow team retrieval and member retrieval by active team members', async () => {
      const student = await registerStudent('Rohan');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ name: 'Waste Reducers' });
      const teamId = teamRes.body.data.team._id;

      // GET /api/teams/:teamId
      const getTeamRes = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${student.token}`);
      assert.strictEqual(getTeamRes.status, 200);
      assert.strictEqual(getTeamRes.body.data.team.name, 'Waste Reducers');
      assert.ok(getTeamRes.body.data.team.members.length === 1);

      // GET /api/teams/:teamId/members
      const getMembersRes = await request(app)
        .get(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${student.token}`);
      assert.strictEqual(getMembersRes.status, 200);
      assert.strictEqual(getMembersRes.body.data.members.length, 1);
      assert.strictEqual(getMembersRes.body.data.members[0].role, 'LEAD');
    });

    it('should block non-members from accessing private team information with 403 Forbidden', async () => {
      const lead = await registerStudent('Ananya');
      const outsider = await registerStudent('Vikram');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Carbon Cutters' });
      const teamId = teamRes.body.data.team._id;

      // Outsider tries to access team details
      const getRes = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${outsider.token}`);
      assert.strictEqual(getRes.status, 403);
      assert.match(getRes.body.message, /Access denied/i);

      // Outsider tries to access team member roster
      const membersRes = await request(app)
        .get(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${outsider.token}`);
      assert.strictEqual(membersRes.status, 403);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. STUDENT SEARCH TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Student Search for Team Invitation', () => {
    it('should search students by query and return only public-safe fields', async () => {
      const searcher = await registerStudent('Searcher');
      const target = await registerStudent('TargetStudent');

      const res = await request(app)
        .get(`/api/users/search?query=${target.user.name.split(' ')[0]}`)
        .set('Authorization', `Bearer ${searcher.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.students));
      assert.ok(res.body.data.students.length > 0);

      const found = res.body.data.students.find(
        (s) => s.userId.toString() === target.user._id.toString()
      );
      assert.ok(found);
      assert.strictEqual(found.name, target.user.name);

      // Verify sensitive data is NOT exposed
      assert.strictEqual(found.email, undefined);
      assert.strictEqual(found.password, undefined);
      assert.strictEqual(found.tokens, undefined);
      assert.strictEqual(found.phone, undefined);
    });

    it('should support pagination and limit in student search', async () => {
      const searcher = await registerStudent('Pager');

      const res = await request(app)
        .get('/api/users/search?page=1&limit=2')
        .set('Authorization', `Bearer ${searcher.token}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.students.length <= 2);
      assert.strictEqual(res.body.data.pagination.page, 1);
      assert.strictEqual(res.body.data.pagination.limit, 2);
      assert.ok(res.body.data.pagination.total >= 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TEAM INVITATIONS & NOTIFICATIONS TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Team Invitation Workflow', () => {
    it('should allow team lead to invite a student and create notification', async () => {
      const lead = await registerStudent('LeadOne');
      const candidate = await registerStudent('CandidateOne');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Eco Knights' });
      const teamId = teamRes.body.data.team._id;

      // Send invite
      const inviteRes = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          inviteeId: candidate.user._id,
          message: 'Join us to plant 1000 trees!',
        });

      assert.strictEqual(inviteRes.status, 201);
      assert.strictEqual(inviteRes.body.success, true);
      assert.strictEqual(inviteRes.body.data.invitation.status, 'PENDING');

      // Verify invitation in DB
      const invitation = await teamInvitationModel.findById(inviteRes.body.data.invitation._id);
      assert.ok(invitation);
      assert.strictEqual(invitation.status, 'PENDING');

      // Verify notification created for candidate
      const notification = await notificationModel.findOne({
        recipient: candidate.user._id,
        type: 'TEAM_INVITATION',
      });
      assert.ok(notification);
      assert.match(notification.message, /Eco Knights/);
    });

    it('should reject non-lead member from sending an invitation with 403 Forbidden', async () => {
      const lead = await registerStudent('LeadTwo');
      const member = await registerStudent('MemberTwo');
      const candidate = await registerStudent('CandidateTwo');
      const event = await createTestEvent({ minSize: 2, maxSize: 5 });

      // Create team
      const team = await teamModel.create({
        name: 'Hydro Heroes',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      // Member attempts to invite
      const res = await request(app)
        .post(`/api/teams/${team._id}/members/invite`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({ inviteeId: candidate.user._id });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /Only the team lead/i);
    });

    it('should reject duplicate active pending invitation with 409 Conflict', async () => {
      const lead = await registerStudent('LeadThree');
      const candidate = await registerStudent('CandidateThree');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Clean Skies' });
      const teamId = teamRes.body.data.team._id;

      // First invite
      await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });

      // Duplicate invite
      const dupRes = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });

      assert.strictEqual(dupRes.status, 409);
      assert.match(dupRes.body.message, /pending invitation has already been sent/i);
    });

    it('should reject self-invitation with 400 Bad Request', async () => {
      const lead = await registerStudent('LeadFour');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Earth Keepers' });
      const teamId = teamRes.body.data.team._id;

      const res = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: lead.user._id });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /cannot invite yourself/i);
    });

    it('should reject invitation if target user is already an active member with 409', async () => {
      const lead = await registerStudent('LeadFive');
      const member = await registerStudent('MemberFive');
      const event = await createTestEvent({ minSize: 2, maxSize: 5 });

      const team = await teamModel.create({
        name: 'Nature Force',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: member.user._id });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /already an active member/i);
    });

    it('should reject invitation when team capacity is reached', async () => {
      const lead = await registerStudent('LeadCap');
      const member = await registerStudent('MemberCap');
      const candidate = await registerStudent('CandidateCap');
      // Max team size = 2
      const event = await createTestEvent({ minSize: 2, maxSize: 2 });

      const team = await teamModel.create({
        name: 'Full Capacity Team',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /maximum capacity/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ACCEPT / REJECT WORKFLOW TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Invitation Acceptance & Rejection Workflow', () => {
    it('should list pending invitations for authenticated student', async () => {
      const lead = await registerStudent('LeadList');
      const candidate = await registerStudent('CandidateList');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Wind Chasers' });
      const teamId = teamRes.body.data.team._id;

      await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });

      const res = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${candidate.token}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.invitations.length >= 1);
      assert.strictEqual(res.body.data.invitations[0].status, 'PENDING');
    });

    it('should allow invited student to accept invitation and atomically join team.members', async () => {
      const lead = await registerStudent('LeadAccept');
      const candidate = await registerStudent('CandidateAccept');
      const event = await createTestEvent({ minSize: 2, maxSize: 4 });

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Bio Warriors' });
      const teamId = teamRes.body.data.team._id;

      const inviteRes = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });
      const invitationId = inviteRes.body.data.invitation._id;

      // Candidate accepts
      const acceptRes = await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${candidate.token}`);

      assert.strictEqual(acceptRes.status, 200);
      assert.strictEqual(acceptRes.body.success, true);
      assert.strictEqual(acceptRes.body.data.membersCount, 2);

      // Verify DB team state: Candidate is now active MEMBER
      const dbTeam = await teamModel.findById(teamId);
      assert.strictEqual(dbTeam.members.length, 2);
      const newMember = dbTeam.members.find(
        (m) => m.user.toString() === candidate.user._id.toString()
      );
      assert.ok(newMember);
      assert.strictEqual(newMember.role, 'MEMBER');
      assert.strictEqual(newMember.status, 'ACTIVE');

      // Verify invitation marked ACCEPTED
      const dbInvite = await teamInvitationModel.findById(invitationId);
      assert.strictEqual(dbInvite.status, 'ACCEPTED');

      // Verify notification sent to lead
      const notify = await notificationModel.findOne({
        recipient: lead.user._id,
        type: 'INVITATION_ACCEPTED',
      });
      assert.ok(notify);
    });

    it('should reject unauthorized user from accepting someone else invitation with 403', async () => {
      const lead = await registerStudent('LeadOther');
      const candidate = await registerStudent('CandidateReal');
      const intruder = await registerStudent('CandidateIntruder');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Wild Protect' });
      const teamId = teamRes.body.data.team._id;

      const inviteRes = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });
      const invitationId = inviteRes.body.data.invitation._id;

      // Intruder attempts to accept
      const res = await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${intruder.token}`);

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /not authorized to respond/i);
    });

    it('should reject accepting an already accepted invitation with 400', async () => {
      const lead = await registerStudent('LeadDouble');
      const candidate = await registerStudent('CandidateDouble');
      const event = await createTestEvent({ minSize: 2, maxSize: 4 });

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'River Cleaners' });
      const teamId = teamRes.body.data.team._id;

      const inviteRes = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });
      const invitationId = inviteRes.body.data.invitation._id;

      // First accept
      await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${candidate.token}`);

      // Second accept
      const secondRes = await request(app)
        .post(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${candidate.token}`);

      assert.strictEqual(secondRes.status, 400);
      assert.match(secondRes.body.message, /cannot be accepted/i);
    });

    it('should reject accepting an expired invitation with 400', async () => {
      const lead = await registerStudent('LeadExpire');
      const candidate = await registerStudent('CandidateExpire');
      const event = await createTestEvent();

      const team = await teamModel.create({
        name: 'Time Travelers',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [{ user: lead.user._id, role: 'LEAD', status: 'ACTIVE' }],
      });

      // Create an already-expired invitation
      const invitation = await teamInvitationModel.create({
        team: team._id,
        inviter: lead.user._id,
        invitee: candidate.user._id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const res = await request(app)
        .post(`/api/invitations/${invitation._id}/accept`)
        .set('Authorization', `Bearer ${candidate.token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /expired/i);
    });

    it('should allow invited student to reject an invitation', async () => {
      const lead = await registerStudent('LeadReject');
      const candidate = await registerStudent('CandidateReject');
      const event = await createTestEvent();

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Urban Green' });
      const teamId = teamRes.body.data.team._id;

      const inviteRes = await request(app)
        .post(`/api/teams/${teamId}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });
      const invitationId = inviteRes.body.data.invitation._id;

      // Candidate rejects
      const res = await request(app)
        .post(`/api/invitations/${invitationId}/reject`)
        .set('Authorization', `Bearer ${candidate.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, 'Invitation rejected');

      const dbInvite = await teamInvitationModel.findById(invitationId);
      assert.strictEqual(dbInvite.status, 'REJECTED');

      // Candidate is NOT in team
      const dbTeam = await teamModel.findById(teamId);
      assert.strictEqual(dbTeam.members.length, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. TEAM FINALIZATION & LEAD REASSIGNMENT TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Team Finalization & Lead Management', () => {
    it('should reject finalization if team has fewer members than event minimum', async () => {
      const lead = await registerStudent('LeadFinalizeMin');
      // Event requires at least 3 members
      const event = await createTestEvent({ minSize: 3, maxSize: 5 });

      const teamRes = await request(app)
        .post(`/api/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ name: 'Team Lone Wolf' });
      const teamId = teamRes.body.data.team._id;

      // Lone lead attempts to finalize
      const res = await request(app)
        .post(`/api/teams/${teamId}/finalize`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /Minimum 3 active members required/i);
    });

    it('should reject finalization by a non-lead member with 403 Forbidden', async () => {
      const lead = await registerStudent('LeadFinAuth');
      const member = await registerStudent('MemberFinAuth');
      const event = await createTestEvent({ minSize: 2, maxSize: 4 });

      const team = await teamModel.create({
        name: 'Team Dual',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/finalize`)
        .set('Authorization', `Bearer ${member.token}`);

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /Only the team lead/i);
    });

    it('should allow authorized team lead to finalize team when size meets event criteria', async () => {
      const lead = await registerStudent('LeadValidFin');
      const member = await registerStudent('MemberValidFin');
      const event = await createTestEvent({ minSize: 2, maxSize: 4 });

      const team = await teamModel.create({
        name: 'Team Ready',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      const res = await request(app)
        .post(`/api/teams/${team._id}/finalize`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'FINALIZED');

      const dbTeam = await teamModel.findById(team._id);
      assert.strictEqual(dbTeam.status, 'FINALIZED');
      assert.ok(dbTeam.finalizedAt);
    });

    it('should prevent roster changes (invitations/acceptance) on a finalized team', async () => {
      const lead = await registerStudent('LeadLock');
      const member = await registerStudent('MemberLock');
      const candidate = await registerStudent('CandidateLock');
      const event = await createTestEvent({ minSize: 2, maxSize: 5 });

      // Create already-finalized team
      const team = await teamModel.create({
        name: 'Locked Team',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'FINALIZED',
        finalizedAt: new Date(),
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      // Lead tries to invite to finalized team
      const inviteRes = await request(app)
        .post(`/api/teams/${team._id}/members/invite`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ inviteeId: candidate.user._id });

      assert.strictEqual(inviteRes.status, 400);
      assert.match(inviteRes.body.message, /Cannot invite members to a finalized team/i);
    });

    it('should atomically reassign team lead to another active team member', async () => {
      const lead = await registerStudent('OldLead');
      const member = await registerStudent('NewLead');
      const event = await createTestEvent({ minSize: 2, maxSize: 4 });

      const team = await teamModel.create({
        name: 'Leadership Team',
        eventId: event._id,
        createdBy: lead.user._id,
        status: 'DRAFT',
        members: [
          { user: lead.user._id, role: 'LEAD', status: 'ACTIVE' },
          { user: member.user._id, role: 'MEMBER', status: 'ACTIVE' },
        ],
      });

      const res = await request(app)
        .patch(`/api/teams/${team._id}/lead`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ newLeadId: member.user._id });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Verify in DB
      const dbTeam = await teamModel.findById(team._id);
      const oldLeadMember = dbTeam.members.find(
        (m) => m.user.toString() === lead.user._id.toString()
      );
      const newLeadMember = dbTeam.members.find(
        (m) => m.user.toString() === member.user._id.toString()
      );

      assert.strictEqual(oldLeadMember.role, 'MEMBER');
      assert.strictEqual(newLeadMember.role, 'LEAD');
    });
  });
});
