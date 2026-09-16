import { studentApi } from './client';

export const challengeApi = {
  async getChallenges(params = {}) {
    try {
      // Backend links challenges to events via GET /api/events/:eventId/challenges
      const eventsRes = await studentApi.get('/events', { params: { limit: 10 } });
      const events = eventsRes.data?.events || eventsRes.events || [];
      
      const allChallenges = [];
      for (const ev of events) {
        try {
          const chRes = await studentApi.get(`/events/${ev._id}/challenges`);
          const list = chRes.data?.challenges || chRes.challenges || (Array.isArray(chRes.data) ? chRes.data : []);
          for (const ch of list) {
            allChallenges.push({ ...ch, event: ev });
          }
        } catch {
          // Ignore if event has no challenges
        }
      }
      return allChallenges;
    } catch {
      return [];
    }
  },

  async getChallengeById(challengeId) {
    const res = await studentApi.get(`/challenges/${challengeId}`);
    return res.data?.challenge || res.data || res;
  },
};
