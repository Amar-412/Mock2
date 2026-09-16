import { studentApi } from './client';

export const notificationApi = {
  async getNotifications(params = {}) {
    const res = await studentApi.get('/notifications', { params });
    return res.data || res;
  },

  async markAsRead(notificationId) {
    const res = await studentApi.patch(`/notifications/${notificationId}/read`);
    return res.data || res;
  },

  async markAllAsRead() {
    const res = await studentApi.patch('/notifications/read-all');
    return res.data || res;
  },
};
