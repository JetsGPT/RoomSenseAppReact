import api from './api';

export const aiAPI = {
    /**
     * Send a chat message to the AI
     * @param {string} message - User's message
     * @param {string} [conversationId] - Optional conversation ID to continue
     * @returns {Promise<{response: string, conversationHistory: Array, conversationId: string}>}
     */
    chat: async (message, conversationId = null) => {
        const body = { message };
        if (conversationId) body.conversationId = conversationId;
        const response = await api.post('/ai/chat', body);
        return response.data;
    },

    /**
     * Analyze sensor and weather data to generate insights
     * @param {Array} sensorData - Sensor data points
     * @param {Array} weatherData - Weather data points
     * @param {string} timeRange - Time range string
     * @returns {Promise<{analysis: string}>}
     */
    analyze: async (sensorData, weatherData, timeRange) => {
        const response = await api.post('/ai/analyze', { sensorData, weatherData, timeRange });
        return response.data;
    },

    /**
     * List all conversations for the current user
     * @returns {Promise<Array<{id, title, created_at, updated_at, message_count}>>}
     */
    listConversations: async () => {
        const response = await api.get('/ai/conversations');
        return response.data;
    },

    /**
     * Get a single conversation with full messages
     * @param {string} id - Conversation UUID
     * @returns {Promise<{id, title, messages, conversation_history, created_at, updated_at}>}
     */
    getConversation: async (id) => {
        const response = await api.get(`/ai/conversations/${id}`);
        return response.data;
    },

    /**
     * Delete a conversation
     * @param {string} id - Conversation UUID
     */
    deleteConversation: async (id) => {
        const response = await api.delete(`/ai/conversations/${id}`);
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
