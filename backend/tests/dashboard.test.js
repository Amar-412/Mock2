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
import evidenceModel from '../src/models/evidence.model.js';
import activityModel from '../src/models/activity.model.js';
import notificationModel from '../src/models/notification.model.js';
import notificationService from '../src/services/notification.service.js';
import activityService from '../src/services/activity.service.js';

describe('Phase 5: Dashboard, Community Feed & Notifications Integration Tests', () => {
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

  // Helper to create team with lead and member
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
      name: custom.name || `Eco Team ${rand}`,
      eventId: event._id,
      createdBy: lead.user._id,
      status: custom.status || 'FINALIZED',
      members,
    });
  };

  describe('1. Student / Team Dashboard (GET /api/teams/:teamId/dashboard)', () => {
    it('allows team lead to retrieve dashboard with accurate stats, challenge, and submission data', async () => {
      const lead = await registerStudent('DashLead');
      const member = await registerStudent('DashMember');
      const event = await createTestEvent();
      const challenge1 = await createTestChallenge(event._id, { title: 'Tree Planting' });
      const challenge2 = await createTestChallenge(event._id, { title: 'Energy Audit' });
      const team = await createTestTeam(lead, member, event);

      // Join challenge 1
      await teamChallengeModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId: challenge1._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      // Join challenge 2
      await teamChallengeModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId: challenge2._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      // Create a submission with evidence
      const submission = await submissionModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId: challenge1._id,
        submittedBy: member.user._id,
        reflection: 'Completed tree planting',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });

      await evidenceModel.create({
        submissionId: submission._id,
        type: 'IMAGE',
        storageKey: 'tree.jpg',
        url: 'http://example.com/tree.jpg',
        originalName: 'tree.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        uploadedBy: member.user._id,
      });

      // Record activity
      await activityService.create({
        eventId: event._id,
        teamId: team._id,
        actorId: member.user._id,
        type: 'SUBMISSION_SUBMITTED',
        visibility: 'PUBLIC',
        metadata: { submissionId: submission._id, challengeId: challenge1._id },
      });

      const res = await request(app)
        .get(`/api/teams/${team._id}/dashboard`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const data = res.body.data;

      // Team & Event check
      assert.strictEqual(data.team._id, team._id.toString());
      assert.strictEqual(data.team.name, team.name);
      assert.strictEqual(data.event._id, event._id.toString());

      // Progress Stats check
      assert.strictEqual(data.stats.totalMembers, 2);
      assert.strictEqual(data.stats.challengesJoined, 2);
      assert.strictEqual(data.stats.submissions, 1);
      assert.strictEqual(data.stats.submittedSubmissions, 1);
      assert.strictEqual(data.stats.evidenceFiles, 1);

      // Verify no fabricated fields
      assert.strictEqual(data.stats.points, undefined);
      assert.strictEqual(data.stats.rank, undefined);
      assert.strictEqual(data.stats.score, undefined);

      // Arrays check
      assert.strictEqual(data.challenges.length, 2);
      assert.strictEqual(data.submissions.length, 1);
      assert.strictEqual(data.submissions[0].evidenceCount, 1);
      assert.ok(data.recentActivity.length >= 1);
    });

    it('allows regular active team member to retrieve dashboard', async () => {
      const lead = await registerStudent('DashLead2');
      const member = await registerStudent('DashMember2');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, member, event);

      const res = await request(app)
        .get(`/api/teams/${team._id}/dashboard`)
        .set('Authorization', `Bearer ${member.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.team._id, team._id.toString());
    });

    it('denies non-member student from accessing another team dashboard with 403', async () => {
      const lead = await registerStudent('DashLead3');
      const outsider = await registerStudent('DashOutsider');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      const res = await request(app)
        .get(`/api/teams/${team._id}/dashboard`)
        .set('Authorization', `Bearer ${outsider.token}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('handles empty team states gracefully without errors', async () => {
      const lead = await registerStudent('EmptyLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      const res = await request(app)
        .get(`/api/teams/${team._id}/dashboard`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.stats.challengesJoined, 0);
      assert.strictEqual(res.body.data.stats.submissions, 0);
      assert.strictEqual(res.body.data.stats.submittedSubmissions, 0);
      assert.strictEqual(res.body.data.stats.evidenceFiles, 0);
      assert.deepStrictEqual(res.body.data.challenges, []);
      assert.deepStrictEqual(res.body.data.submissions, []);
      assert.deepStrictEqual(res.body.data.recentActivity, []);
    });
  });

  describe('2. Team Activity (GET /api/teams/:teamId/activity)', () => {
    it('returns paginated team activity for team members', async () => {
      const lead = await registerStudent('ActLead');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      // Create multiple activities
      for (let i = 0; i < 3; i++) {
        await activityService.create({
          eventId: event._id,
          teamId: team._id,
          actorId: lead.user._id,
          type: 'CHALLENGE_JOINED',
          visibility: 'TEAM',
          metadata: { index: i },
        });
      }

      const res = await request(app)
        .get(`/api/teams/${team._id}/activity?page=1&limit=2`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.items.length, 2);
      assert.strictEqual(res.body.data.pagination.page, 1);
      assert.strictEqual(res.body.data.pagination.limit, 2);
      assert.strictEqual(res.body.data.pagination.total, 3);
      assert.strictEqual(res.body.data.pagination.totalPages, 2);
    });

    it('rejects non-members from viewing team activity with 403', async () => {
      const lead = await registerStudent('ActLead2');
      const outsider = await registerStudent('ActOutsider');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, null, event);

      const res = await request(app)
        .get(`/api/teams/${team._id}/activity`)
        .set('Authorization', `Bearer ${outsider.token}`);

      assert.strictEqual(res.status, 403);
    });
  });

  describe('3. Community Activity Feed (GET /api/community/feed)', () => {
    it('returns public activities and excludes private team activities', async () => {
      const student1 = await registerStudent('CommLead1');
      const student2 = await registerStudent('CommViewer');
      const event = await createTestEvent();
      const team = await createTestTeam(student1, null, event);

      // Public milestone activity
      await activityService.create({
        eventId: event._id,
        teamId: team._id,
        actorId: student1.user._id,
        type: 'TEAM_FINALIZED',
        visibility: 'PUBLIC',
        metadata: { teamName: team.name },
      });

      // Private activity
      await activityService.create({
        eventId: event._id,
        teamId: team._id,
        actorId: student1.user._id,
        type: 'SUBMISSION_CREATED',
        visibility: 'TEAM',
        metadata: { secret: 'do-not-leak' },
      });

      const res = await request(app)
        .get('/api/community/feed')
        .set('Authorization', `Bearer ${student2.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.items));

      // All returned items must have visibility PUBLIC
      for (const item of res.body.data.items) {
        assert.strictEqual(item.visibility, 'PUBLIC');
        // Check no private passwords or secrets leaked
        if (item.metadata) {
          assert.strictEqual(item.metadata.secret, undefined);
        }
      }

      // Check pagination metadata structure
      assert.ok(res.body.data.pagination);
      assert.strictEqual(typeof res.body.data.pagination.page, 'number');
      assert.strictEqual(typeof res.body.data.pagination.total, 'number');
    });

    it('supports pagination on community feed', async () => {
      const student = await registerStudent('CommPagStudent');
      const event = await createTestEvent();
      const team = await createTestTeam(student, null, event);

      for (let i = 0; i < 5; i++) {
        await activityService.create({
          eventId: event._id,
          teamId: team._id,
          actorId: student.user._id,
          type: 'CHALLENGE_JOINED',
          visibility: 'PUBLIC',
          metadata: { count: i },
        });
      }

      const res = await request(app)
        .get('/api/community/feed?page=1&limit=2')
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.items.length, 2);
      assert.strictEqual(res.body.data.pagination.page, 1);
      assert.strictEqual(res.body.data.pagination.limit, 2);
    });

    it('requires authentication for community feed', async () => {
      const res = await request(app).get('/api/community/feed');
      assert.strictEqual(res.status, 401);
    });
  });

  describe('4. Notifications System', () => {
    it('allows an authenticated student to view only their notifications', async () => {
      const studentA = await registerStudent('NotifUserA');
      const studentB = await registerStudent('NotifUserB');

      // Create notification for Student A
      await notificationService.createNotification({
        recipientId: studentA.user._id,
        senderId: studentB.user._id,
        type: 'TEAM_INVITATION',
        title: 'Join Team',
        message: 'You have been invited to join Team Eco.',
        data: { foo: 'bar' },
      });

      // Create notification for Student B
      await notificationService.createNotification({
        recipientId: studentB.user._id,
        senderId: studentA.user._id,
        type: 'TEAM_FINALIZED',
        title: 'Team Finalized',
        message: 'Your team is finalized.',
      });

      // Student A queries notifications
      const resA = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentA.token}`);

      assert.strictEqual(resA.status, 200);
      assert.strictEqual(resA.body.success, true);
      assert.strictEqual(resA.body.data.items.length, 1);
      assert.strictEqual(resA.body.data.items[0].recipient.toString(), studentA.user._id.toString());
      assert.strictEqual(resA.body.data.items[0].type, 'TEAM_INVITATION');

      // Student B queries notifications
      const resB = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentB.token}`);

      assert.strictEqual(resB.status, 200);
      assert.strictEqual(resB.body.data.items.length, 1);
      assert.strictEqual(resB.body.data.items[0].recipient.toString(), studentB.user._id.toString());
      assert.strictEqual(resB.body.data.items[0].type, 'TEAM_FINALIZED');
    });

    it('filters notifications by unreadOnly flag', async () => {
      const student = await registerStudent('NotifFilterUser');

      const notif1 = await notificationService.createNotification({
        recipientId: student.user._id,
        type: 'TEAM_INVITATION',
        title: 'Invite 1',
        message: 'Message 1',
      });

      const notif2 = await notificationService.createNotification({
        recipientId: student.user._id,
        type: 'CHALLENGE_JOINED',
        title: 'Challenge Joined',
        message: 'Message 2',
      });

      // Mark notif1 as read
      await notificationService.markAsRead(notif1._id, student.user._id);

      // Query all
      const resAll = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${student.token}`);
      assert.strictEqual(resAll.body.data.items.length, 2);
      assert.strictEqual(resAll.body.data.unreadCount, 1);

      // Query unread only
      const resUnread = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${student.token}`);
      assert.strictEqual(resUnread.body.data.items.length, 1);
      assert.strictEqual(resUnread.body.data.items[0]._id.toString(), notif2._id.toString());
    });

    it('allows recipient to mark a notification as read (PATCH /api/notifications/:id/read)', async () => {
      const student = await registerStudent('NotifReadUser');

      const notif = await notificationService.createNotification({
        recipientId: student.user._id,
        type: 'TEAM_FINALIZED',
        title: 'Team Locked',
        message: 'Team roster is locked.',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.notification.read, true);
      assert.ok(res.body.data.notification.readAt);
    });

    it('blocks a user from marking another user notification as read with 403', async () => {
      const studentOwner = await registerStudent('NotifOwner');
      const studentAttacker = await registerStudent('NotifAttacker');

      const notif = await notificationService.createNotification({
        recipientId: studentOwner.user._id,
        type: 'TEAM_FINALIZED',
        title: 'Private Notice',
        message: 'Private to owner',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${studentAttacker.token}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('allows recipient to mark all notifications as read (PATCH /api/notifications/read-all)', async () => {
      const student = await registerStudent('NotifReadAllUser');

      await notificationService.createNotification({
        recipientId: student.user._id,
        type: 'TEAM_FINALIZED',
        title: 'Notice 1',
        message: 'Notice 1',
      });

      await notificationService.createNotification({
        recipientId: student.user._id,
        type: 'SUBMISSION_SUBMITTED',
        title: 'Notice 2',
        message: 'Notice 2',
      });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${student.token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.modifiedCount, 2);

      // Verify unread count is now 0
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${student.token}`);
      assert.strictEqual(listRes.body.data.unreadCount, 0);
    });
  });

  describe('5. Automatic Notification Triggers on Team & Submission Workflows', () => {
    it('creates notifications for team members when team is finalized', async () => {
      const lead = await registerStudent('FinalLead');
      const member = await registerStudent('FinalMember');
      const event = await createTestEvent();
      const team = await createTestTeam(lead, member, event, { status: 'DRAFT' });

      // Finalize team as lead
      const res = await request(app)
        .post(`/api/teams/${team._id}/finalize`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(res.status, 200);

      // Member should have received a TEAM_FINALIZED notification
      const memberNotifs = await notificationModel.find({
        recipient: member.user._id,
        type: 'TEAM_FINALIZED',
      });
      assert.strictEqual(memberNotifs.length, 1);
      assert.ok(memberNotifs[0].title.includes('Finalized'));
    });

    it('creates notifications for team members when team joins a challenge', async () => {
      const lead = await registerStudent('JoinChallLead');
      const member = await registerStudent('JoinChallMember');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const team = await createTestTeam(lead, member, event, { status: 'FINALIZED' });

      const res = await request(app)
        .post(`/api/teams/${team._id}/challenges`)
        .set('Authorization', `Bearer ${lead.token}`)
        .send({ challengeId: challenge._id });

      assert.strictEqual(res.status, 201);

      // Both lead and member should have received a CHALLENGE_JOINED notification
      const memberNotifs = await notificationModel.find({
        recipient: member.user._id,
        type: 'CHALLENGE_JOINED',
      });
      assert.strictEqual(memberNotifs.length, 1);
      assert.ok(memberNotifs[0].title.includes('Joined'));
    });

    it('creates notifications for team members when a submission is finalized', async () => {
      const lead = await registerStudent('SubNotifLead');
      const member = await registerStudent('SubNotifMember');
      const event = await createTestEvent();
      const challenge = await createTestChallenge(event._id);
      const team = await createTestTeam(lead, member, event, { status: 'FINALIZED' });

      await teamChallengeModel.create({
        teamId: team._id,
        eventId: event._id,
        challengeId: challenge._id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      // Create draft submission
      const subRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${lead.token}`)
        .send({
          teamId: team._id,
          eventId: event._id,
          challengeId: challenge._id,
          reflection: 'First draft reflection',
        });

      assert.strictEqual(subRes.status, 201);
      const submissionId = subRes.body.data.submission._id;

      // Submit submission
      const submitRes = await request(app)
        .post(`/api/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${lead.token}`);

      assert.strictEqual(submitRes.status, 200);

      // Check member notification
      const memberNotifs = await notificationModel.find({
        recipient: member.user._id,
        type: 'SUBMISSION_SUBMITTED',
      });
      assert.strictEqual(memberNotifs.length, 1);
      assert.strictEqual(memberNotifs[0].data.submissionId.toString(), submissionId.toString());
    });
  });
});
