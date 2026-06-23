// # axios — the tool we use to send/receive data from backend
import axios from 'axios';

// # toast — shows success/error popup notifications
import toast from 'react-hot-toast';
import dashboardMock from '../mocks/dashboardMock';

// ─── BASE CONFIGURATION ───────────────────────────────────────────
// # All API calls go to this address
// # When backend is running locally, it runs on port 8000
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// # Create a configured axios instance
// # Every API call we make uses these default settings
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,                          // # 30 seconds max wait time
  headers: {
    'Content-Type': 'application/json',    // # We send JSON data
  },
});

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────
// # Runs BEFORE every request is sent
// # Perfect place to add auth tokens in future
api.interceptors.request.use(
  (config) => {
    // # Log every outgoing request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────
// # Runs AFTER every response comes back
// # Handles errors in one central place
api.interceptors.response.use(
  (response) => {
    // # If response is successful, just return it
    return response;
  },
  (error) => {
    // # Extract a readable error message from whatever format backend sends
    const message =
      error.response?.data?.detail ||       // # FastAPI error format
      error.response?.data?.message ||      // # Generic format
      error.message ||                      // # Network error
      'Something went wrong';

    // # Show error toast popup to user
    toast.error(message);

    // # Log full error for developer debugging
    console.error('API Error:', error.response?.data || error.message);

    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════
//  JOBS API
//  All functions related to job postings
// ═══════════════════════════════════════════════════════════════════

export const jobsAPI = {

  // # Fetch all jobs from backend
  getAll: () =>
    api.get('/jobs').then(r => r.data),

  // # Fetch one specific job by its ID
  getById: (id) =>
    api.get(`/jobs/${id}`).then(r => r.data),

  // # Create a new job posting
  // # jobData = { title, description, skills, salary }
  create: (jobData) =>
    api.post('/jobs', jobData).then(r => r.data),

  // # Update an existing job
  update: (id, jobData) =>
    api.put(`/jobs/${id}`, jobData).then(r => r.data),

  // # Delete a job posting
  delete: (id) =>
    api.delete(`/jobs/${id}`).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  CANDIDATES API
//  All functions related to candidates
// ═══════════════════════════════════════════════════════════════════

export const candidatesAPI = {

  // # Fetch all candidates — optional filters by job or status
  getAll: (params = {}) =>
    api.get('/candidates', { params }).then(r => r.data),

  // # Fetch one candidate's full profile
  getById: (id) =>
    api.get(`/candidates/${id}`).then(r => r.data),

  // # Upload a resume PDF file
  // # file = the actual File object from browser
  // # jobId = which job they are applying for
  uploadResume: (file, jobId) => {
    // # FormData is used to send files — not regular JSON
    const formData = new FormData();
    formData.append('file', file);          // # The PDF file itself
    formData.append('job_id', jobId);       // # Which job they applied for

    return api.post('/candidates/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // # Override to file upload mode
      },
      // # Track upload progress — shows percentage in UI
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percent}%`);
      },
    }).then(r => r.data);
  },

  // # Update candidate's hiring stage
  // # status = 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected'
  updateStatus: (id, status) =>
    api.patch(`/candidates/${id}/status`, { status }).then(r => r.data),

  // # Delete a candidate from the system
  delete: (id) =>
    api.delete(`/candidates/${id}`).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  INTERVIEWS API
//  All functions related to interview scheduling
// ═══════════════════════════════════════════════════════════════════

export const interviewsAPI = {

  // # Fetch all interviews — optional filter by date
  getAll: (params = {}) =>
    api.get('/interviews', { params }).then(r => r.data),

  // # Fetch only today's interviews
  getToday: () =>
    api.get('/interviews/today').then(r => r.data),

  // # Book a new interview slot
  // # data = { candidate_id, job_id, scheduled_at, interviewer_name }
  create: (data) =>
    api.post('/interviews', data).then(r => r.data),

  // # Update interview details or status
  update: (id, data) =>
    api.put(`/interviews/${id}`, data).then(r => r.data),

  // # Cancel an interview
  cancel: (id) =>
    api.patch(`/interviews/${id}/cancel`).then(r => r.data),

  // # Delete interview record
  delete: (id) =>
    api.delete(`/interviews/${id}`).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD API
//  Summary stats for the home screen
// ═══════════════════════════════════════════════════════════════════

export const dashboardAPI = {

  // # Fetch all overview numbers — jobs count, candidates count, etc.
    getStats: async () => {
      try {
        const res = await api.get('/dashboard/stats');
        return res.data;
      } catch (err) {
        // Fall back to local mock data during development when backend is down
        if (process.env.NODE_ENV === 'development') return dashboardMock.stats;
        throw err;
      }
    },

  // # Fetch recent activity feed
    getRecentActivity: async () => {
      try {
        const res = await api.get('/dashboard/activity');
        return res.data;
      } catch (err) {
        if (process.env.NODE_ENV === 'development') return dashboardMock.activity;
        throw err;
      }
    },
};

// # Export the base api instance too — useful for custom calls
export default api;