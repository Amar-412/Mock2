import { studentApi, coreApi } from './client';

export const authApi = {
  async login(email, password) {
    try {
      // First try studentApi on Port 5005 (has full user profile & role in JWT)
      const res = await studentApi.post('/auth/login', { email, password });
      return res.data || res;
    } catch (err) {
      // If student API rejects (401), try the core platform API on Port 3000
      try {
        const coreRes = await coreApi.post('/auth/login', { email, password });
        const token = coreRes.accessToken;

        if (!token) throw new Error('No access token returned from core API');

        // Fetch role directly from /auth/get-me using the FRESH token.
        // Do NOT use localStorage token here — it may be stale from a prior session.
        const meRes = await coreApi.get('/auth/get-me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const role = meRes.user?.role || meRes.role || 'STUDENT';

        return {
          accessToken: token,
          user: {
            ...coreRes.user,
            ...meRes.user,
            role,
          },
        };
      } catch {
        throw err;
      }
    }
  },

  async register(userData) {
    const res = await studentApi.post('/auth/register', userData);
    return res.data || res;
  },

  async getMe() {
    // Check stored role to route to the right API
    const storedUserRaw = localStorage.getItem('yuwa_auth_user');
    const storedRole = storedUserRaw ? JSON.parse(storedUserRaw)?.role : null;

    if (storedRole === 'ADMIN' || storedRole === 'EVALUATOR') {
      // Core API returns { message, user: { username, email } }
      const coreRes = await coreApi.get('/auth/get-me');
      return coreRes.user || coreRes;
    }

    // Student: try student API first, fall back to core
    try {
      const res = await studentApi.get('/auth/me');
      return res.data?.user || res.data || res;
    } catch {
      const coreRes = await coreApi.get('/auth/get-me');
      return coreRes.user || coreRes;
    }
  },

  async logout() {
    const token = localStorage.getItem('yuwa_auth_token');
    localStorage.removeItem('yuwa_auth_token');
    localStorage.removeItem('yuwa_auth_user');

    if (token) {
      try {
        await studentApi.post('/auth/logout', null, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Backend logout failure must never block or retry local logout
      }
    }
  },
};
