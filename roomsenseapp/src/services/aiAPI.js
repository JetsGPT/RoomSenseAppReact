import api from './api';
import { DEV_MODE } from '../config/devConfig';
import {
    mockDeleteConversation,
    mockGetConversation,
    mockGetStatus,
    mockListConversations,
    storeLocalConversationExchange,
} from './mockAi';
import { buildDevAiContext } from './devAiContext';

const DEV_AI_REQUEST_HEADERS = {
    'X-RoomSense-Dev-AI': '1',
};

function createMockAiError(status, message) {
    const error = new Error(message);
    error.response = {
        status,
        data: {
            error: message,
        },
    };
    return error;
}

export const aiAPI = {
    /**
     * Send a chat message to the AI
     * @param {string} message - User's message
     * @param {string} [conversationId] - Optional conversation ID to continue
     * @returns {Promise<{response: string, conversationHistory: Array, conversationId: string}>}
     */
    chat: async (message, conversationId = null) => {
        if (DEV_MODE) {
            const existingConversation = conversationId
                ? mockGetConversation(conversationId)
                : null;
            const conversationHistory = Array.isArray(existingConversation?.conversation_history)
                ? existingConversation.conversation_history
                : [];

            const response = await api.post('/ai/chat', {
                message,
                conversationId,
                conversationHistory,
                context: buildDevAiContext(),
            }, {
                headers: DEV_AI_REQUEST_HEADERS,
            });

            const responseText = typeof response.data?.response === 'string'
                ? response.data.response
                : String(response.data?.response || '');

            const storedConversation = storeLocalConversationExchange({
                conversationId,
                message,
                response: responseText,
                conversationHistory: response.data?.conversationHistory,
            });

            return {
                response: responseText,
                conversationHistory: storedConversation.conversation.conversation_history,
                conversationId: storedConversation.conversationId,
            };
        }

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
        if (DEV_MODE) {
            const response = await api.post('/ai/analyze', {
                sensorData,
                weatherData,
                timeRange,
            }, {
                headers: DEV_AI_REQUEST_HEADERS,
            });

            return response.data;
        }

        const response = await api.post('/ai/analyze', { sensorData, weatherData, timeRange });
        return response.data;
    },

    /**
     * List all conversations for the current user
     * @returns {Promise<Array<{id, title, created_at, updated_at, message_count}>>}
     */
    listConversations: async () => {
        if (DEV_MODE) {
            return mockListConversations();
        }

        const response = await api.get('/ai/conversations');
        return response.data;
    },

    /**
     * Get a single conversation with full messages
     * @param {string} id - Conversation UUID
     * @returns {Promise<{id, title, messages, conversation_history, created_at, updated_at}>}
     */
    getConversation: async (id) => {
        if (DEV_MODE) {
            const conversation = mockGetConversation(id);
            if (!conversation) {
                throw createMockAiError(404, 'Conversation not found');
            }

            return conversation;
        }

        const response = await api.get(`/ai/conversations/${id}`);
        return response.data;
    },

    /**
     * Delete a conversation
     * @param {string} id - Conversation UUID
     */
    deleteConversation: async (id) => {
        if (DEV_MODE) {
            const deleted = mockDeleteConversation(id);
            if (!deleted) {
                throw createMockAiError(404, 'Conversation not found');
            }

            return { success: true };
        }

        const response = await api.delete(`/ai/conversations/${id}`);
        return response.data;
    },

    /**
     * Check if the AI service is available
     * @returns {Promise<{available: boolean, model: string}>}
     */
    getStatus: async () => {
        if (DEV_MODE) {
            try {
                const response = await api.get('/ai/status', {
                    headers: DEV_AI_REQUEST_HEADERS,
                });
                return response.data;
            } catch {
                return mockGetStatus();
            }
        }

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
