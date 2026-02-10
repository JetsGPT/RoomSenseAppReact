import axios from 'axios';

// Hardcoded API base URL
// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';


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
    getCsrfToken: async () => {
        try {
            const response = await api.get('/csrf-token');
            const token = response.data.csrfToken;
            if (token) {
                api.defaults.headers.common['X-CSRF-Token'] = token;
                console.log('[API] CSRF Token set:', token);
            }
            return token;
        } catch (error) {
            console.error('[API] Failed to fetch CSRF token:', error);
            throw error;
        }
    },

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

// BLE Device Management API
export const bleAPI = {
    scanDevices: async () => {
        const response = await api.get('/devices/scan');
        return response.data;
    },

    connectDevice: async (address, name = null) => {
        // Backend Long-poll is 30s, so we set timeout to 40s to be safe
        const response = await api.post(`/devices/connect/${address.toUpperCase()}`, { name }, { timeout: 40000 });
        return response.data;
    },

    pairDevice: async (address, pin) => {
        const response = await api.post(`/devices/pair/${address.toUpperCase()}`, { pin });
        return response.data;
    },

    disconnectDevice: async (address) => {
        const response = await api.post(`/devices/disconnect/${address.toUpperCase()}`);
        return response.data;
    },

    getActiveConnections: async () => {
        const response = await api.get('/devices/connections');
        return response.data;
    },

    getHealth: async () => {
        const response = await api.get('/devices/health');
        return response.data;
    },

    renameDevice: async (address, display_name) => {
        const response = await api.patch(`/devices/connect/${address.toUpperCase()}`, { display_name });
        return response.data;
    },
};

// Import sensors API
export { sensorsAPI, sensorHelpers } from './sensorsAPI.js';
export { notificationsAPI } from './notificationsAPI.js';

export default api;
