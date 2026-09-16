import { coreApi } from './client';

export const adminApi = {
  async getDashboard() {
    const res = await coreApi.get('/admin/dashboard');
    return res.data || res;
  },

  async getColleges(params = {}) {
    const res = await coreApi.get('/admin/colleges', { params });
    return res.data || res;
  },

  async createCollege(collegeData) {
    const res = await coreApi.post('/admin/colleges', collegeData);
    return res.data || res;
  },

  async getEvents(params = {}) {
    const res = await coreApi.get('/admin/events', { params });
    return res.data || res;
  },

  async createEvent(eventData) {
    const res = await coreApi.post('/admin/events', eventData);
    return res.data || res;
  },

  async getEvaluators(params = {}) {
    const res = await coreApi.get('/admin/evaluators', { params });
    return res.data || res;
  },

  async createEvaluator(evaluatorData) {
    const res = await coreApi.post('/admin/evaluators', evaluatorData);
    return res.data || res;
  },

  async getLeaderboard(eventId) {
    const res = await coreApi.get(`/admin/events/${eventId}/leaderboard`);
    return res.data || res;
  },

  async getEventSubmissions(eventId) {
    const res = await coreApi.get(`/admin/events/${eventId}/submissions`);
    return res.data || res;
  },

  async getHistoricalAnalytics() {
    const res = await coreApi.get('/admin/analytics/historical');
    return res.data || res;
  },
};
