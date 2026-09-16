import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTotalScore } from '../src/services/scoring.service.js';
import {
  filterEligibleEvaluators,
  selectLeastLoadedEvaluator,
} from '../src/services/evaluation-assignment.service.js';

test('calculateTotalScore sums backend criteria scores', () => {
  const criteria = [
    { name: 'Evidence Quality', score: 18, maxScore: 20 },
    { name: 'Waste Recovered', score: 25, maxScore: 30 },
    { name: 'Participation', score: 17, maxScore: 20 },
    { name: 'Community Engagement', score: 18, maxScore: 20 },
    { name: 'Reflection', score: 8, maxScore: 10 },
  ];

  assert.equal(calculateTotalScore(criteria), 86);
});

test('filterEligibleEvaluators excludes same-college and overloaded evaluators', () => {
  const evaluators = [
    { evaluatorId: 'e1', collegeId: 'college-1', pendingCount: 0, isActive: true },
    { evaluatorId: 'e2', collegeId: 'college-2', pendingCount: 4, isActive: true },
    { evaluatorId: 'e3', collegeId: 'college-3', pendingCount: 2, isActive: false },
    { evaluatorId: 'e4', collegeId: 'college-4', pendingCount: 1, isActive: true },
  ];

  const eligible = filterEligibleEvaluators(evaluators, 'college-1', 3);

  assert.deepEqual(eligible.map((item) => item.evaluatorId), ['e4']);
});

test('selectLeastLoadedEvaluator picks the lowest pending evaluator among ties', () => {
  const evaluators = [
    { evaluatorId: 'e1', pendingCount: 2 },
    { evaluatorId: 'e2', pendingCount: 1 },
    { evaluatorId: 'e3', pendingCount: 1 },
  ];

  const selected = selectLeastLoadedEvaluator(evaluators);
  assert.ok(['e2', 'e3'].includes(selected.evaluatorId));
});
