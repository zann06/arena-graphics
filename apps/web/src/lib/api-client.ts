import axios from 'axios';

export const apiClient = axios.create({
  // Same-origin by default: the built SPA is served by the API server, and the
  // Vite dev server proxies /api to it (see vite.config.ts).
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// The Vite dev server proxies /api -> :4000, but a direct `vite preview` of the
// built assets does not, so allow overriding via VITE_API_URL when needed.

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request was made but no response (network error or timeout)
      const isTimeout = error.code === 'ECONNABORTED';
      return Promise.reject(
        new Error(isTimeout ? 'Server did not respond in time. Is the local server running?' : 'No response from server. Please check your connection.')
      );
    } else {
      // Something else happened
      return Promise.reject(error);
    }
  }
);

export default apiClient;
