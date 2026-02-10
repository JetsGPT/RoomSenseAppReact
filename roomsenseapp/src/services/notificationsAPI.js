/**
 * Notifications API Service
 *
 * Provides functions for managing notification rules and viewing
 * notification history. Uses the shared api instance which already
 * handles CSRF tokens, session cookies, and base URL configuration.
 */

import api from './api.js';

export const notificationsAPI = {
    /**
     * Get the current status of the notification rule engine
     * @returns {Promise<Object>} { running: boolean, checkedAt: string, ... }
     */
    async getEngineStatus() {
        const response = await api.get('/notifications/status');
        return response.data;
    },

    /**
     * Get all notification rules for the current user
     * @returns {Promise<Array>} Array of rule objects
     */
    async getRules() {
        const response = await api.get('/notifications');
        return response.data;
    },

    /**
     * Create a new notification rule
     * @param {Object} data - Rule data
     * @param {string} data.sensor_id - Sensor box address
     * @param {string} data.metric - Metric name (temperature, humidity, etc.)
     * @param {string} data.operator - Comparison operator (>, <, ==, !=)
     * @param {number} data.threshold - Threshold value
     * @param {string} data.ntfy_topic - ntfy notification topic
     * @param {number} [data.cooldown_minutes] - Cooldown between notifications
     * @returns {Promise<Object>} Created rule with ID
     */
    async createRule(data) {
        const response = await api.post('/notifications', data);
        return response.data;
    },

    /**
     * Update an existing notification rule
     * @param {string|number} id - Rule ID
     * @param {Object} data - Partial rule updates
     * @returns {Promise<Object>} Updated rule
     */
    async updateRule(id, data) {
        const response = await api.put(`/notifications/${id}`, data);
        return response.data;
    },

    /**
     * Delete a notification rule
     * @param {string|number} id - Rule ID
     * @returns {Promise<void>}
     */
    async deleteRule(id) {
        await api.delete(`/notifications/${id}`);
    },

    /**
     * Get notification history / log entries
     * @param {Object} [params] - Optional query params (limit, offset, etc.)
     * @returns {Promise<Array>} Array of history entry objects
     */
    async getHistory(params = {}) {
        const response = await api.get('/notifications/history', { params });
        return response.data;
    },
};

export default notificationsAPI;
