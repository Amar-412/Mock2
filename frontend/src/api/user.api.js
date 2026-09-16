import { studentApi } from './client';

export const userApi = {
  async getProfile() {
    const res = await studentApi.get('/users/me');
    return res.data?.user || res.data;
  },

  async updateProfile(updates) {
    const res = await studentApi.patch('/users/me', updates);
    return res.data?.user || res.data;
  },

  async searchStudents(query = '', page = 1, limit = 20) {
    const res = await studentApi.get('/users/search', {
      params: { query, page, limit },
    });
    return res.data || res;
  },
};
