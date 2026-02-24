import api from './api';

export const aiAPI = {
    /**
     * Send a chat message to the AI
     * @param {string} message - User's message
     * @param {Array} conversationHistory - Previous conversation turns
     * @returns {Promise<{response: string, conversationHistory: Array}>}
     */
    chat: async (message, conversationHistory = []) => {
        const response = await api.post('/ai/chat', {
            message,
            conversationHistory
        });
        return response.data;
    },

    /**
     * Check if the AI service is available
     * @returns {Promise<{available: boolean, model: string}>}
     */
    getStatus: async () => {
        const response = await api.get('/ai/status');
        return response.data;
    }
};

export const settingsAPI = {
    /**
     * Get all system settings (admin only)
     */
    getAll: async () => {
        const response = await api.get('/settings');
        return response.data;
    },

    /**
     * Get a specific setting
     */
    get: async (key) => {
        const response = await api.get(`/settings/${encodeURIComponent(key)}`);
        return response.data;
    },

    /**
     * Create or update a setting (admin only)
     */
    set: async (key, value, { is_sensitive, description } = {}) => {
        const response = await api.put(`/settings/${encodeURIComponent(key)}`, {
            value,
            is_sensitive,
            description
        });
        return response.data;
    },

    /**
     * Delete a setting (admin only)
     */
    delete: async (key) => {
        const response = await api.delete(`/settings/${encodeURIComponent(key)}`);
        return response.data;
    }
};
