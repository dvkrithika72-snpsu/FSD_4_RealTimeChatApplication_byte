import axios from 'axios';
import { getApiUrl } from '../config';

const api = axios.create({
  baseURL: getApiUrl(),
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
