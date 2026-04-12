import axios from 'axios';
import { DEV_MODE, DEV_CONNECTIONS, DEV_WIFI_NETWORKS, DEV_SCANNED_DEVICES, DEV_MOCK_PAIRING_MODE } from '../config/devConfig';

// Hardcoded API base URL
// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const SAFE_METHODS = new Set(['get', 'head', 'options']);
const CSRF_HEADER_NAME = 'X-CSRF-Token';


// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

const csrfApi = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let csrfTokenPromise = null;

function getHeaderValue(headers, headerName) {
    if (!headers) {
        return undefined;
    }

    if (typeof headers.get === 'function') {
        return headers.get(headerName);
    }

    const matchingKey = Object.keys(headers).find(
        (key) => key.toLowerCase() === headerName.toLowerCase()
    );

    return matchingKey ? headers[matchingKey] : undefined;
}

function setHeaderValue(headers, headerName, value) {
    if (!headers) {
        return { [headerName]: value };
    }

    if (typeof headers.set === 'function') {
        headers.set(headerName, value);
        return headers;
    }

    return {
        ...headers,
        [headerName]: value,
    };
}

function getStoredCsrfToken() {
    return api.defaults.headers.common[CSRF_HEADER_NAME];
}

function setStoredCsrfToken(token) {
    if (!token) {
        return;
    }

    api.defaults.headers.common[CSRF_HEADER_NAME] = token;
}

async function ensureCsrfToken({ force = false } = {}) {
    if (!force) {
        const existingToken = getStoredCsrfToken();
        if (existingToken) {
            return existingToken;
        }
    }

    if (!csrfTokenPromise) {
        csrfTokenPromise = csrfApi.get('/csrf-token')
            .then((response) => {
                const token = response.data.csrfToken;
                if (token) {
                    setStoredCsrfToken(token);
                    console.log('[API] CSRF Token set:', token);
                }

                return token;
            })
            .catch((error) => {
                console.error('[API] Failed to fetch CSRF token:', error);
                throw error;
            })
            .finally(() => {
                csrfTokenPromise = null;
            });
    }

    return csrfTokenPromise;
}

function isUnsafeRequest(config) {
    const method = String(config?.method || 'get').toLowerCase();
    return !SAFE_METHODS.has(method);
}

function isCsrfTokenRequest(config) {
    return String(config?.url || '').includes('/csrf-token');
}

function isCsrfFailure(error) {
    const status = error?.response?.status;
    const message = String(
        error?.response?.data?.error
        || error?.response?.data?.message
        || ''
    );

    return status === 403 && /csrf/i.test(message);
}

api.interceptors.request.use(async (config) => {
    if (!isUnsafeRequest(config) || isCsrfTokenRequest(config)) {
        return config;
    }

    if (!getHeaderValue(config.headers, CSRF_HEADER_NAME)) {
        await ensureCsrfToken();
    }

    const token = getStoredCsrfToken();
    if (token && !getHeaderValue(config.headers, CSRF_HEADER_NAME)) {
        config.headers = setHeaderValue(config.headers, CSRF_HEADER_NAME, token);
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const requestConfig = error?.config;

        if (!requestConfig || requestConfig.__csrfRetry || isCsrfTokenRequest(requestConfig) || !isCsrfFailure(error)) {
            return Promise.reject(error);
        }

        requestConfig.__csrfRetry = true;
        await ensureCsrfToken({ force: true });

        const token = getStoredCsrfToken();
        if (token) {
            requestConfig.headers = setHeaderValue(requestConfig.headers, CSRF_HEADER_NAME, token);
        }

        return api.request(requestConfig);
    }
);

// Auth API calls
export const authAPI = {
    getCsrfToken: async () => {
        return ensureCsrfToken({ force: true });
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
        if (DEV_MODE) { return new Promise(resolve => setTimeout(() => resolve(DEV_SCANNED_DEVICES), 2000)); }
        const response = await api.get('/devices/scan');
        return response.data;
    },

    connectDevice: async (address, name = null) => {
        if (DEV_MODE) { return new Promise(resolve => setTimeout(() => resolve((DEV_SCANNED_DEVICES.find(d => d.address === address) && DEV_MOCK_PAIRING_MODE) ? { status: 'pin_required' } : { status: 'connected' }), 1000)); }
        // Backend Long-poll is 30s, so we set timeout to 40s to be safe
        const response = await api.post(`/devices/connect/${address.toUpperCase()}`, { name }, { timeout: 40000 });
        return response.data;
    },

    pairDevice: async (address, pin) => {
        if (DEV_MODE) { return new Promise((resolve, reject) => setTimeout(() => { if (parseInt(pin) === 123456) resolve({ status: 'paired' }); else { const err = new Error('Invalid PIN'); err.response = { status: 400, data: { detail: 'Invalid PIN. Try 123456.' } }; reject(err); } }, 1500)); }
        const response = await api.post(`/devices/pair/${address.toUpperCase()}`, { pin });
        return response.data;
    },

    disconnectDevice: async (address) => {
        if (DEV_MODE) return { message: 'Mock disconnected from ' + address };
        const response = await api.post(`/devices/disconnect/${address.toUpperCase()}`);
        return response.data;
    },

    getActiveConnections: async () => {
        if (DEV_MODE) return DEV_CONNECTIONS;
        const response = await api.get('/devices/connections');
        return response.data;
    },

    getHealth: async () => {
        const response = await api.get('/devices/health');
        return response.data;
    },

    renameDevice: async (address, display_name) => {
        if (DEV_MODE) return { message: 'Mock renamed ' + address + ' to ' + display_name };
        const response = await api.patch(`/devices/connect/${address.toUpperCase()}`, { display_name });
        return response.data;
    },

    getKnownDevices: async () => {
        if (DEV_MODE) return DEV_CONNECTIONS;
        const response = await api.get('/devices/known_devices');
        return response.data;
    },

    forgetDevice: async (address) => {
        if (DEV_MODE) return { message: 'Mock forgot ' + address };
        const response = await api.delete(`/devices/known_devices/${address.toUpperCase()}`);
        return response.data;
    },
};

// System Settings API
export const settingsAPI = {
    getAll: async () => {
        if (DEV_MODE) return { 'mock_setting': { value: 'true', description: 'Mocked API Setting' } };
        const response = await api.get('/settings');
        return response.data;
    },

    get: async (key) => {
        if (DEV_MODE) return { value: 'mock_val' };
        const response = await api.get(`/settings/${key}`);
        return response.data;
    },

    update: async (key, value, description = null, is_sensitive = false) => {
        if (DEV_MODE) return { message: 'Mock updated ' + key };
        const response = await api.put(`/settings/${key}`, { value, description, is_sensitive });
        return response.data;
    },

    delete: async (key) => {
        if (DEV_MODE) return { message: 'Mock deleted ' + key };
        const response = await api.delete(`/settings/${key}`);
        return response.data;
    },
};

export const systemAPI = {
    getInfo: async () => {
        if (DEV_MODE) {
             return {
                 wifiSupported: DEV_WIFI_NETWORKS.wifiSupported,
                 wifiConnected: DEV_WIFI_NETWORKS.current.connected,
                 wifiSsid: DEV_WIFI_NETWORKS.current.ssid,
                 wifiInterface: DEV_WIFI_NETWORKS.current.interface
             };
        }
        const response = await api.get('/system/info');
        return response.data;
    },

    getWifiNetworks: async () => {
        if (DEV_MODE) {
            return new Promise(resolve => setTimeout(() => resolve(DEV_WIFI_NETWORKS), 1000));
        }
        const response = await api.get('/system/wifi/networks', { timeout: 15000 });
        return response.data;
    },

    connectWifi: async ({ ssid, password = null }) => {
        if (DEV_MODE) {
            return new Promise(resolve => setTimeout(() => resolve({ message: `Mock connected to ${ssid}` }), 2000));
        }
        const response = await api.post('/system/wifi/connect', { ssid, password }, { timeout: 8000 });
        return response.data;
    },

    reboot: async () => {
        if (DEV_MODE) return { message: 'Mock reboot command initiated!' };
        const response = await api.post('/system/reboot');
        return response.data;
    },
};

// Import sensors API
export { sensorsAPI, sensorHelpers } from './sensorsAPI.js';
export { notificationsAPI } from './notificationsAPI.js';

export default api;
