import axios from 'axios';

export const BASE_URL = 'https://api.inizio.in';
// export const BASE_URL = 'http://192.168.1.4:5046';


const api = axios.create({
  baseURL: `${BASE_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };