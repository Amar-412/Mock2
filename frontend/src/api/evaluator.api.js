import { coreApi } from './client';

export const evaluatorApi = {
  async getDashboard() {
    const res = await coreApi.get('/evaluator/dashboard');
    return res.data || res;
  },

  async listEvaluations(params = {}) {
    const res = await coreApi.get('/evaluator/evaluations', { params });
    return res.data || res;
  },

  async getEvaluationById(evaluationId) {
    const res = await coreApi.get(`/evaluator/evaluations/${evaluationId}`);
    return res.data || res;
  },

  async patchEvaluation(evaluationId, data) {
    const res = await coreApi.patch(`/evaluator/evaluations/${evaluationId}`, data);
    return res.data || res;
  },

  async submitEvaluation(evaluationId) {
    const res = await coreApi.post(`/evaluator/evaluations/${evaluationId}/submit`);
    return res.data || res;
  },
};
