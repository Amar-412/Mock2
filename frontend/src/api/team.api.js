import { studentApi } from './client';

export const teamApi = {
  async getTeamDashboard(teamId) {
    const res = await studentApi.get(`/teams/${teamId}/dashboard`);
    return res.data || res;
  },

  async getTeam(teamId) {
    const res = await studentApi.get(`/teams/${teamId}`);
    return res.data?.team || res.data || res;
  },

  async getTeamMembers(teamId) {
    const res = await studentApi.get(`/teams/${teamId}/members`);
    return res.data?.members || res.data || [];
  },

  async createTeamForEvent(eventId, teamData) {
    const res = await studentApi.post(`/events/${eventId}/teams`, teamData);
    return res.data || res;
  },

  async inviteMember(teamId, inviteData) {
    const res = await studentApi.post(`/teams/${teamId}/members/invite`, inviteData);
    return res.data || res;
  },

  async finalizeTeam(teamId) {
    const res = await studentApi.post(`/teams/${teamId}/finalize`);
    return res.data || res;
  },

  async disbandTeam(teamId) {
    const res = await studentApi.post(`/teams/${teamId}/disband`);
    return res.data || res;
  },

  async reassignLead(teamId, newLeadId) {
    const res = await studentApi.patch(`/teams/${teamId}/lead`, { newLeadId });
    return res.data || res;
  },

  async getMyInvitations() {
    const res = await studentApi.get('/invitations');
    return res.data?.invitations || res.data || [];
  },

  async acceptInvitation(inviteId) {
    const res = await studentApi.post(`/invitations/${inviteId}/accept`);
    return res.data || res;
  },

  async rejectInvitation(inviteId) {
    const res = await studentApi.post(`/invitations/${inviteId}/reject`);
    return res.data || res;
  },

  async getTeamChallenges(teamId) {
    const res = await studentApi.get(`/teams/${teamId}/challenges`);
    return res.data?.challenges || res.data || [];
  },

  async joinTeamChallenge(teamId, challengeId) {
    const res = await studentApi.post(`/teams/${teamId}/challenges`, { challengeId });
    return res.data || res;
  },

  async leaveTeamChallenge(teamId, challengeId) {
    const res = await studentApi.delete(`/teams/${teamId}/challenges/${challengeId}`);
    return res.data || res;
  },

  async getTeamSubmissions(teamId) {
    const res = await studentApi.get(`/teams/${teamId}/submissions`);
    return res.data?.submissions || res.data || [];
  },

  async getTeamActivity(teamId) {
    const res = await studentApi.get(`/teams/${teamId}/activity`);
    return res.data?.activities || res.data || [];
  },
};
