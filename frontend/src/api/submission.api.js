import { studentApi } from './client';

export const submissionApi = {
  async createSubmission(submissionData) {
    const res = await studentApi.post('/submissions', submissionData);
    return res.data?.submission || res.data || res;
  },

  async getSubmissionById(submissionId) {
    const res = await studentApi.get(`/submissions/${submissionId}`);
    return res.data?.submission || res.data || res;
  },

  async uploadEvidence(submissionId, formData) {
    const res = await studentApi.post(`/submissions/${submissionId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.evidence || res.data || res;
  },

  async finalizeSubmission(submissionId) {
    const res = await studentApi.post(`/submissions/${submissionId}/submit`);
    return res.data?.submission || res.data || res;
  },

  async syncOfflineSubmissions(submissions) {
    const res = await studentApi.post('/submissions/sync', { submissions });
    return res.data || res;
  },
};
