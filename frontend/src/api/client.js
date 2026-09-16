import axios from 'axios';

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL || 'http://localhost:3000/api';
const STUDENT_API_URL = import.meta.env.VITE_STUDENT_API_URL || 'http://localhost:5005/api';

// Create Axios instances
export const coreApi = axios.create({
  baseURL: CORE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

export const studentApi = axios.create({
  baseURL: STUDENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Attach JWT Token
const attachAuthToken = (config) => {
  const token = localStorage.getItem('yuwa_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

coreApi.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
studentApi.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));

// Response Interceptors: Normalize & Error Handling
const handleResponseSuccess = (response) => {
  // If response.data is formatted with { success, data }, pass response.data
  return response.data;
};

let isDispatchingExpiry = false;

const handleResponseError = (error) => {
  if (!error.response) {
    // Network or offline error
    return Promise.reject(new Error('Network error or server unreachable.'));
  }

  const { status, data, config } = error.response;
  const requestUrl = config?.url || '';
  const isAuthEndpoint = requestUrl.includes('/auth/logout') || requestUrl.includes('/auth/login');

  if (status === 401 && !isAuthEndpoint) {
    // Expired or invalid token on a protected route
    localStorage.removeItem('yuwa_auth_token');
    localStorage.removeItem('yuwa_auth_user');

    if (!isDispatchingExpiry) {
      isDispatchingExpiry = true;
      window.dispatchEvent(new CustomEvent('yuwa:auth:unauthorized'));
      setTimeout(() => {
        isDispatchingExpiry = false;
      }, 1000);
    }
  }

  const message = data?.message || data?.error || `Request failed with status ${status}`;
  const customError = new Error(message);
  customError.status = status;
  customError.data = data;
  return Promise.reject(customError);
};

coreApi.interceptors.response.use(handleResponseSuccess, handleResponseError);
studentApi.interceptors.response.use(handleResponseSuccess, handleResponseError);
