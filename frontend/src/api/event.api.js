import { studentApi } from './client';

export const eventApi = {
  async getEvents(params = {}) {
    const res = await studentApi.get('/events', { params });
    return res.data || res;
  },

  async getEventById(eventId) {
    const res = await studentApi.get(`/events/${eventId}`);
    return res.data?.event || res.data || res;
  },

  async getEventChallenges(eventId) {
    const res = await studentApi.get(`/events/${eventId}/challenges`);
    return res.data?.challenges || res.data || [];
  },

  async registerForEvent(eventId, registrationData) {
    const res = await studentApi.post(`/events/${eventId}/register`, registrationData);
    return res.data || res;
  },

  async getEventRegistration(eventId) {
    const res = await studentApi.get(`/events/${eventId}/registration`);
    return res.data?.registration || res.data || null;
  },
};
