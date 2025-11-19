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

    register: async (user, password) => {
        const response = await api.post('/users/register', { user, password });
        return response.data;
    },

    updateUserRole: async (userId, role) => {
        const response = await api.put(`/users/${userId}/role`, { role });
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

    // Roles and Permissions Management
    getAllRoles: async () => {
        const response = await api.get('/users/roles');
        return response.data;
    },

    getRolePermissions: async (role) => {
        const response = await api.get(`/users/roles/${encodeURIComponent(role)}/permissions`);
        return response.data;
    },

    updateRolePermissions: async (role, permissions) => {
        const response = await api.put(`/users/roles/${encodeURIComponent(role)}/permissions`, {
            permissions
        });
        return response.data;
    },

    createRole: async (name) => {
        const response = await api.post('/users/roles', { name });
        return response.data;
    },

    deleteRole: async (role, reassignTo = null) => {
        const config = reassignTo ? { params: { reassignTo } } : {};
        const response = await api.delete(`/users/roles/${encodeURIComponent(role)}`, config);
        return response.data;
    },
};

// Import sensors API
export { sensorsAPI, sensorHelpers } from './sensorsAPI.js';

export default api;

