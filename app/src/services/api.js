import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const seatAPI = {
  getAllSeats: () => api.get('/seats'),
  getSeatsByDate: (date) => api.get(`/seats/date/${date}`),
  getSeatStats: (date) => api.get('/seats/stats', { params: { date } }),
  initializeSeats: () => api.post('/seats/initialize'),
  assignDesignatedSeats: () => api.post('/seats/assign'),
};

export const bookingAPI = {
  getAvailableSeats: (date) => api.get(`/bookings/available/${date}`),
  bookSeat: (seatId, date, startTime, endTime) => api.post('/bookings/book', { seatId, date, startTime, endTime }),
  cancelBooking: (bookingId) => api.delete(`/bookings/${bookingId}`),
  releaseDesignatedSeat: (date) => api.post('/bookings/release', { date }),
  getMyBookings: (date) => api.get('/bookings/my-bookings', { params: { date } }),
  getWeekSchedule: (startDate, endDate) => api.get('/bookings/schedule', { params: { startDate, endDate } }),
};

export default api;
