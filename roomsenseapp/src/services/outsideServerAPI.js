import axios from 'axios';

// OutsideServer API base URL
// In dev, Vite proxies /outside-api → https://localhost:8443
const OUTSIDE_API_BASE = import.meta.env.VITE_OUTSIDE_API_URL || '/outside-api';
const OUTSIDE_WS_BASE = import.meta.env.VITE_OUTSIDE_WS_URL || 'wss://localhost:8443';

// Create a separate axios instance for OutsideServer
const outsideApi = axios.create({
    baseURL: OUTSIDE_API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * OutsideServer Auth & Health API
 */
export const outsideAuthAPI = {
    /**
     * Health check — GET /
     */
    health: async () => {
        const response = await outsideApi.get('/');
        return response.data;
    },

    /**
     * Register — POST /register
     * @param {string} username
     * @param {string} email
     * @param {string} password
     */
    register: async (username, email, password) => {
        const response = await outsideApi.post('/register', { username, email, password });
        return response.data;
    },

    /**
     * Login — POST /login
     * @param {string} email
     * @param {string} password
     */
    login: async (email, password) => {
        const response = await outsideApi.post('/login', { email, password });
        return response.data;
    },
};

/**
 * OutsideServer Proxy API
 * Proxies requests through the OutsideServer to connected boxes.
 */
export const outsideProxyAPI = {
    /**
     * Send a proxy request to a connected box
     * @param {string} boxId - UUID of the target box
     * @param {string} path  - Path on the box (e.g. "/api/sensors")
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
     * @param {object|null} body - Request body (for POST/PUT/PATCH)
     */
    request: async (boxId, path, method = 'GET', body = null) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const url = `/proxy/${boxId}${normalizedPath}`;

        const config = { method: method.toLowerCase(), url };

        if (body && !['get', 'delete'].includes(method.toLowerCase())) {
            config.data = body;
        }

        const response = await outsideApi(config);
        return response.data;
    },
};

/**
 * WebSocket Gateway helper
 * Creates and manages a WebSocket connection to the OutsideServer gateway.
 */
export function createGatewayWebSocket(onMessage, onOpen, onClose, onError) {
    const wsUrl = `${OUTSIDE_WS_BASE}/ws/gateway`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = (event) => {
        console.log('[OutsideServer WS] Connected to gateway');
        if (onOpen) onOpen(event);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
        } catch (err) {
            console.warn('[OutsideServer WS] Non-JSON message:', event.data);
            if (onMessage) onMessage(event.data);
        }
    };

    ws.onclose = (event) => {
        console.log('[OutsideServer WS] Disconnected', event.code, event.reason);
        if (onClose) onClose(event);
    };

    ws.onerror = (event) => {
        console.error('[OutsideServer WS] Error:', event);
        if (onError) onError(event);
    };

    return ws;
}

export default outsideApi;
