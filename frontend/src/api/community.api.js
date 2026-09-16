import { studentApi } from './client';

export const communityApi = {
  async getFeed(params = {}) {
    const res = await studentApi.get('/community/feed', { params });
    return res.data || res;
  },
};
