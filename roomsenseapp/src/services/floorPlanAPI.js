/**
 * Floor Plan API Service
 * 
 * Provides functions for interacting with the floor plan API backend.
 * Handles floor plan CRUD operations and sensor placement management.
 */

// Import the main API instance which already has:
// - withCredentials: true (for session cookies)
// - CSRF token header setup
// - Proper base URL configuration
import api from './api.js';

// ============================================================================
// Floor Plan API Functions
// ============================================================================

export const floorPlanAPI = {
    /**
     * Get all floor plans for the current user
     * @returns {Promise<Array>} Array of floor plan objects
     */
    async getFloorPlans() {
        const response = await api.get('/floor-plans');
        return response.data;
    },

    /**
     * Get a specific floor plan by ID
     * @param {string} id - Floor plan ID
     * @returns {Promise<Object>} Floor plan object with elements and sensors
     */
    async getFloorPlan(id) {
        const response = await api.get(`/floor-plans/${id}`);
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
        const response = await api.post('/floor-plans', floorPlan);
        return response.data;
    },

    /**
     * Update an existing floor plan
     * @param {string} id - Floor plan ID
     * @param {Object} updates - Partial floor plan updates
     * @returns {Promise<Object>} Updated floor plan
     */
    async updateFloorPlan(id, updates) {
        const response = await api.put(`/floor-plans/${id}`, updates);
        return response.data;
    },

    /**
     * Delete a floor plan
     * @param {string} id - Floor plan ID
     * @returns {Promise<void>}
     */
    async deleteFloorPlan(id) {
        await api.delete(`/floor-plans/${id}`);
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
        const response = await api.get(`/floor-plans/${floorPlanId}/sensors`);
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
        const response = await api.post(
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
        const response = await api.put(
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
        await api.delete(`/floor-plans/${floorPlanId}/sensors/${sensorId}`);
    },
};

// ============================================================================
// Local Storage Fallback (for components that need synchronous access)
// ============================================================================

const STORAGE_KEY = 'roomsense_floor_plans';

/**
 * LocalStorage-based floor plan storage for synchronous access.
 * Used by FloorPlanViewer and other components that need immediate data access
 * without async API calls.
 */
export const floorPlanStorage = {
    /**
     * Get all floor plans from localStorage
     * @returns {Array} Array of floor plan objects
     */
    getAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load floor plans from storage:', error);
            return [];
        }
    },

    /**
     * Get a specific floor plan by ID
     * @param {string} id - Floor plan ID
     * @returns {Object|null} Floor plan object or null
     */
    get(id) {
        const plans = this.getAll();
        return plans.find(p => p.id === id) || null;
    },

    /**
     * Save a floor plan to localStorage
     * @param {Object} floorPlan - Floor plan object with id
     * @returns {Object} Saved floor plan
     */
    save(floorPlan) {
        const plans = this.getAll();
        const existingIndex = plans.findIndex(p => p.id === floorPlan.id);

        const planToSave = {
            ...floorPlan,
            id: floorPlan.id || crypto.randomUUID(),
            updatedAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
            plans[existingIndex] = planToSave;
        } else {
            planToSave.createdAt = new Date().toISOString();
            plans.push(planToSave);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        return planToSave;
    },

    /**
     * Remove a floor plan from localStorage
     * @param {string} id - Floor plan ID
     */
    remove(id) {
        const plans = this.getAll().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    },
};

export default floorPlanAPI;
