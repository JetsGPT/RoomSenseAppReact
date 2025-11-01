import axios from 'axios';

// Hardcoded API base URL
const API_BASE_URL = 'https://localhost:8081/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth API calls
export const authAPI = {
    login: async (user, password) => {
        const response = await api.post('/users/login', { user, password });
        return response.data;
    },

    register: async (user, password, role = 'user') => {
        const response = await api.post('/users/register', { user, password, role });
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/users/logout');
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },

    getAllUsers: async () => {
        const response = await api.get('/users/all');
        return response.data;
    },
};

// Import sensors API
export { sensorsAPI, sensorHelpers } from './sensorsAPI.js';

export default api;

