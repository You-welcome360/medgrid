import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medgrid_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Standardize error formats for easier catch logging
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message: string =
      error.response?.data?.message ?? error.message ?? 'Something went wrong';
    const status: number = error.response?.status ?? 500;
    return Promise.reject({ message, status });
  }
);
