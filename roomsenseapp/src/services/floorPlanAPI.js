/**
 * Floor Plan API Service
 * 
 * Provides functions for interacting with the floor plan API backend.
 * Handles floor plan CRUD operations and sensor placement management.
 */

import axios from 'axios';

// API base URL - uses same pattern as sensorsAPI
const API_BASE_URL = import.meta.env.VITE_SENSOR_API_URL || '/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================================
// Floor Plan API Functions
// ============================================================================

export const floorPlanAPI = {
    /**
     * Get all floor plans for the current user
     * @returns {Promise<Array>} Array of floor plan objects
     */
    async getFloorPlans() {
        const response = await apiClient.get('/floor-plans');
        return response.data;
    },

    /**
     * Get a specific floor plan by ID
     * @param {string} id - Floor plan ID
     * @returns {Promise<Object>} Floor plan object with elements and sensors
     */
    async getFloorPlan(id) {
        const response = await apiClient.get(`/floor-plans/${id}`);
        return response.data;
    },

    /**
     * Create a new floor plan
     * @param {Object} floorPlan - Floor plan data
     * @param {string} floorPlan.name - Name of the floor plan
     * @param {Array} [floorPlan.elements] - Drawing elements
     * @param {Object} [floorPlan.viewSettings] - Zoom/pan settings
     * @returns {Promise<Object>} Created floor plan with ID
     */
    async createFloorPlan(floorPlan) {
        const response = await apiClient.post('/floor-plans', floorPlan);
        return response.data;
    },

    /**
     * Update an existing floor plan
     * @param {string} id - Floor plan ID
     * @param {Object} updates - Partial floor plan updates
     * @returns {Promise<Object>} Updated floor plan
     */
    async updateFloorPlan(id, updates) {
        const response = await apiClient.put(`/floor-plans/${id}`, updates);
        return response.data;
    },

    /**
     * Delete a floor plan
     * @param {string} id - Floor plan ID
     * @returns {Promise<void>}
     */
    async deleteFloorPlan(id) {
        await apiClient.delete(`/floor-plans/${id}`);
    },

    // ========================================================================
    // Sensor Placement API Functions
    // ========================================================================

    /**
     * Get all sensor placements for a floor plan
     * @param {string} floorPlanId - Floor plan ID
     * @returns {Promise<Array>} Array of sensor placement objects
     */
    async getSensorPlacements(floorPlanId) {
        const response = await apiClient.get(`/floor-plans/${floorPlanId}/sensors`);
        return response.data;
    },

    /**
     * Add a sensor placement to a floor plan
     * @param {string} floorPlanId - Floor plan ID
     * @param {Object} placement - Sensor placement data
     * @param {string} placement.sensorBoxId - Reference to sensor box
     * @param {Object} placement.position - { x, y } normalized coordinates
     * @param {string} [placement.label] - Optional custom label
     * @returns {Promise<Object>} Created sensor placement with ID
     */
    async addSensorPlacement(floorPlanId, placement) {
        const response = await apiClient.post(
            `/floor-plans/${floorPlanId}/sensors`,
            placement
        );
        return response.data;
    },

    /**
     * Update a sensor placement position
     * @param {string} floorPlanId - Floor plan ID
     * @param {string} sensorId - Sensor placement ID
     * @param {Object} updates - Position or label updates
     * @returns {Promise<Object>} Updated sensor placement
     */
    async updateSensorPlacement(floorPlanId, sensorId, updates) {
        const response = await apiClient.put(
            `/floor-plans/${floorPlanId}/sensors/${sensorId}`,
            updates
        );
        return response.data;
    },

    /**
     * Remove a sensor from a floor plan
     * @param {string} floorPlanId - Floor plan ID
     * @param {string} sensorId - Sensor placement ID
     * @returns {Promise<void>}
     */
    async removeSensorPlacement(floorPlanId, sensorId) {
        await apiClient.delete(`/floor-plans/${floorPlanId}/sensors/${sensorId}`);
    },
};

export default floorPlanAPI;
