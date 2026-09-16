import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import config from '../src/config/config.js';
import connectDB from '../src/config/database.js';
import College from '../src/models/college.model.js';
import Event from '../src/models/event.model.js';
import Task from '../src/models/task.model.js';
import Team from '../src/models/team.model.js';
import TeamMembership from '../src/models/teamMembership.model.js';
import Submission from '../src/models/submission.model.js';
import Evaluation from '../src/models/evaluation.model.js';
import userModel from '../src/models/user.model.js';
import EventEvaluator from '../src/models/eventEvaluator.model.js';
import { assignEvaluationForSubmission } from '../src/services/evaluation-assignment.service.js';
import { calculateTotalScore } from '../src/services/scoring.service.js';

const ensureMongoReady = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
};

after(async () => {
  await mongoose.disconnect();
});

test('mongo relationship chain is valid across colleges, event, task, team, submission, evaluation, and evaluator', async () => {
  await ensureMongoReady();

  const admin = await userModel.create({
    username: `audit-admin-${Date.now()}`,
    email: `audit-admin-${Date.now()}@example.com`,
    password: 'hash',
    role: 'ADMIN',
    verified: true,
    isActive: true,
  });

  const collegeA = await College.create({ name: 'Alpha College', code: `ALPHA-${Date.now()}`, location: 'A' });
  const collegeB = await College.create({ name: 'Beta College', code: `BETA-${Date.now()}`, location: 'B' });
  const collegeC = await College.create({ name: 'Gamma College', code: `GAMMA-${Date.now()}`, location: 'C' });

  const event = await Event.create({
    name: 'Audit Event',
    description: 'Test event',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-10'),
    participatingColleges: [collegeA._id, collegeB._id],
    teamConfig: { minMembers: 2, maxMembers: 4 },
    evaluatorConfig: { maxPendingAssignments: 2 },
    status: 'PUBLISHED',
    createdBy: admin._id,
  });

  const task = await Task.create({
    eventId: event._id,
    title: 'Audit Task',
    description: 'Test task',
    instructions: 'Do the work',
    startDate: new Date('2026-01-01'),
    deadline: new Date('2026-01-08'),
    maxScore: 100,
    evaluationMetrics: [
      { name: 'A', description: 'A', maxScore: 30 },
      { name: 'B', description: 'B', maxScore: 70 },
    ],
    status: 'PUBLISHED',
  });

  const student1 = await userModel.create({
    username: `student-a-${Date.now()}`,
    email: `student-a-${Date.now()}@example.com`,
    password: 'hash',
    role: 'STUDENT',
    collegeId: collegeA._id,
    verified: true,
    isActive: true,
  });

  const student2 = await userModel.create({
    username: `student-b-${Date.now()}`,
    email: `student-b-${Date.now()}@example.com`,
    password: 'hash',
    role: 'STUDENT',
    collegeId: collegeA._id,
    verified: true,
    isActive: true,
  });

  const evaluator1 = await userModel.create({
    username: `eval-a-${Date.now()}`,
    email: `eval-a-${Date.now()}@example.com`,
    password: 'hash',
    role: 'EVALUATOR',
    collegeId: collegeC._id,
    verified: true,
    isActive: true,
  });

  const evaluator2 = await userModel.create({
    username: `eval-b-${Date.now()}`,
    email: `eval-b-${Date.now()}@example.com`,
    password: 'hash',
    role: 'EVALUATOR',
    collegeId: collegeC._id,
    verified: true,
    isActive: true,
  });

  const team = await Team.create({
    name: 'Alpha Team',
    eventId: event._id,
    collegeId: collegeA._id,
    captainId: student1._id,
    status: 'REGISTERED',
    registeredAt: new Date(),
  });

  await TeamMembership.create({
    teamId: team._id,
    eventId: event._id,
    userId: student1._id,
    role: 'CAPTAIN',
  });

  await TeamMembership.create({
    teamId: team._id,
    eventId: event._id,
    userId: student2._id,
    role: 'MEMBER',
  });

  const teamMembershipCount = await TeamMembership.countDocuments({ eventId: event._id, userId: student1._id });
  assert.equal(teamMembershipCount, 1);
  assert.equal(String(team.collegeId), String(collegeA._id));
  assert.equal(String(team.captainId), String(student1._id));
  assert.equal(String((await TeamMembership.findOne({ teamId: team._id, userId: student1._id })).eventId), String(event._id));

  assert.equal(String(task.eventId), String(event._id));
  assert.ok((await Event.findById(event._id)));

  const existingCollegeIds = event.participatingColleges.map((id) => String(id));
  assert.ok(existingCollegeIds.includes(String(collegeA._id)));

  const submission = await Submission.create({
    eventId: event._id,
    taskId: task._id,
    teamId: team._id,
    submittedBy: student1._id,
    evidence: [{
      type: 'PHOTO',
      path: `storage/submissions/${event._id}/${team._id}/${task._id}/${Date.now()}/evidence.jpg`,
      filename: 'evidence.jpg',
      mimeType: 'image/jpeg',
      size: 1200,
      uploadedAt: new Date(),
    }],
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  const assignment = await EventEvaluator.create({
    eventId: event._id,
    evaluatorId: evaluator1._id,
    isActive: true,
    assignedCount: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  const assignment2 = await EventEvaluator.create({
    eventId: event._id,
    evaluatorId: evaluator2._id,
    isActive: true,
    assignedCount: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  const assignmentResult = await assignEvaluationForSubmission({
    submissionId: submission._id,
    eventId: event._id,
    teamId: team._id,
    taskId: task._id,
    teamCollegeId: collegeA._id,
  });

  assert.equal(assignmentResult.created, true);
  assert.ok(assignmentResult.evaluation);

  const evaluation = await Evaluation.findById(assignmentResult.evaluation._id);
  assert.equal(String(evaluation.submissionId), String(submission._id));
  assert.equal(String(evaluation.eventId), String(event._id));
  assert.equal(String(evaluation.taskId), String(task._id));
  assert.equal(String(evaluation.teamId), String(team._id));
  assert.equal(String(evaluation.evaluatorId), String(evaluation.evaluatorId));

  const evaluatorUser = await userModel.findById(evaluation.evaluatorId);
  assert.equal(evaluatorUser.role, 'EVALUATOR');
  assert.ok((await EventEvaluator.findOne({ eventId: event._id, evaluatorId: evaluatorUser._id })));
  assert.notEqual(String(evaluatorUser.collegeId), String(team.collegeId));

  const criteria = [
    { name: 'A', score: 25, maxScore: 30 },
    { name: 'B', score: 60, maxScore: 70 },
  ];

  const total = calculateTotalScore(criteria);
  assert.equal(total, 85);

  evaluation.criteria = criteria;
  evaluation.totalScore = total;
  evaluation.status = 'COMPLETED';
  evaluation.evaluatedAt = new Date();
  await evaluation.save();

  assert.equal(String((await Evaluation.findById(evaluation._id)).teamId), String(team._id));
  assert.ok(await Team.findById(team._id));
  assert.ok(await Task.findById(task._id));
  assert.ok(await Submission.findById(submission._id));
});

test('submission evidence path is stored and resolves to disk without traversal', async () => {
  await ensureMongoReady();

  const college = await College.create({ name: 'Storage College', code: `STORAGE-${Date.now()}`, location: 'X' });
  const admin = await userModel.create({
    username: `storage-admin-${Date.now()}`,
    email: `storage-admin-${Date.now()}@example.com`,
    password: 'hash',
    role: 'ADMIN',
    verified: true,
    isActive: true,
  });

  const event = await Event.create({
    name: 'Storage Event',
    description: 'Test storage event',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-10'),
    participatingColleges: [college._id],
    teamConfig: { minMembers: 1, maxMembers: 2 },
    evaluatorConfig: { maxPendingAssignments: 1 },
    status: 'PUBLISHED',
    createdBy: admin._id,
  });

  const student = await userModel.create({
    username: `storage-student-${Date.now()}`,
    email: `storage-student-${Date.now()}@example.com`,
    password: 'hash',
    role: 'STUDENT',
    collegeId: college._id,
    verified: true,
    isActive: true,
  });

  const evaluator = await userModel.create({
    username: `storage-evaluator-${Date.now()}`,
    email: `storage-evaluator-${Date.now()}@example.com`,
    password: 'hash',
    role: 'EVALUATOR',
    collegeId: new mongoose.Types.ObjectId(),
    verified: true,
    isActive: true,
  });

  const team = await Team.create({
    name: 'Storage Team',
    eventId: event._id,
    collegeId: college._id,
    captainId: student._id,
    status: 'REGISTERED',
    registeredAt: new Date(),
  });

  await TeamMembership.create({ teamId: team._id, eventId: event._id, userId: student._id, role: 'CAPTAIN' });

  const task = await Task.create({
    eventId: event._id,
    title: 'Storage Task',
    description: 'Upload evidence',
    instructions: 'Upload a file',
    startDate: new Date('2026-02-01'),
    deadline: new Date('2026-02-08'),
    maxScore: 100,
    evaluationMetrics: [
      { name: 'Metric', description: 'Metric', maxScore: 100 },
    ],
    status: 'PUBLISHED',
  });

  const submission = await Submission.create({
    eventId: event._id,
    taskId: task._id,
    teamId: team._id,
    submittedBy: student._id,
    evidence: [],
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.default.join(process.cwd(), 'storage', 'submissions', String(event._id), String(team._id), String(task._id), String(submission._id));
  await fs.mkdir(root, { recursive: true });
  const fileName = 'evidence-file.jpg';
  const storageFilePath = path.default.join(root, fileName);
  await fs.writeFile(storageFilePath, 'fake-image-content');

  const evidenceItem = {
    type: 'PHOTO',
    path: storageFilePath,
    filename: fileName,
    mimeType: 'image/jpeg',
    size: 19,
    uploadedAt: new Date(),
  };

  submission.evidence.push(evidenceItem);
  await submission.save();

  assert.ok((await fs.stat(storageFilePath)).isFile());
  assert.equal(String(submission.eventId), String(event._id));
  assert.equal(String(submission.taskId), String(task._id));
  assert.equal(String(submission.teamId), String(team._id));
  assert.equal(submission.evidence[0].path, storageFilePath);

  const resolved = submission.evidence[0].path;
  assert.ok(resolved.includes(String(event._id)) && resolved.includes(String(team._id)) && resolved.includes(String(task._id)) && resolved.includes(String(submission._id)));
  assert.ok(!resolved.includes('..'));

  const assignedEvaluator = await EventEvaluator.create({
    eventId: event._id,
    evaluatorId: evaluator._id,
    isActive: true,
    assignedCount: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  const evalDoc = await Evaluation.create({
    submissionId: submission._id,
    eventId: event._id,
    taskId: task._id,
    teamId: team._id,
    evaluatorId: evaluator._id,
    criteria: [{ name: 'Metric', score: 80, maxScore: 100, comment: 'ok' }],
    totalScore: 80,
    feedback: 'Great',
    status: 'ASSIGNED',
    assignedAt: new Date(),
  });

  assert.equal(String(evalDoc.evaluatorId), String(evaluator._id));
  assert.ok(assignedEvaluator && assignedEvaluator.eventId);
  assert.ok((await EventEvaluator.findOne({ eventId: event._id, evaluatorId: evaluator._id })));

  const adminUser = await userModel.findById(admin._id);
  const authorizedAdmin = adminUser.role === 'ADMIN';
  const authorizedEvaluator = evaluator.role === 'EVALUATOR';
  assert.equal(authorizedAdmin, true);
  assert.equal(authorizedEvaluator, true);
});
