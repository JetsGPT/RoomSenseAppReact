import axios from 'axios';

// Get API base URL from localStorage or use default
const getApiBaseUrl = () => {
    try {
        const savedSettings = localStorage.getItem('roomsense-settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            return settings.apiBaseUrl || 'https://localhost:8081/api';
        }
    } catch (error) {
        console.error('Error loading API settings:', error);
    }
    return 'https://localhost:8081/api';
};

// Create axios instance with configurable base URL
const createApiInstance = () => {
    return axios.create({
        baseURL: getApiBaseUrl(),
        withCredentials: true, // Important for session cookies
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

// Create initial instance
let api = createApiInstance();

// Function to update API base URL
export const updateApiBaseUrl = (newUrl) => {
    api = axios.create({
        baseURL: newUrl,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

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

