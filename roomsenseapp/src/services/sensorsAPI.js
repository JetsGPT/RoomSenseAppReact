/**
 * Sensors API service
 * 
 * Provides functions for interacting with the sensors API backend.
 * Handles data fetching, filtering, and helper operations.
 */

import axios from 'axios';
import { DEFAULT_TIME_RANGE_VALUE, DEFAULT_DATA_LIMIT } from '../config/sensorConfig';

// ============================================================================
// Configuration
// ============================================================================

/** Sensors API base URL */
const SENSORS_API_BASE_URL = import.meta.env.VITE_API_URL || '/api';


/** Create axios instance with default configuration */
const api = axios.create({
    baseURL: SENSORS_API_BASE_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build query parameters object from filters.
 * @private
 * @param {Object} params - Filter parameters
 * @param {string} [params.sensor_box] - Filter by sensor box
 * @param {string} [params.sensor_type] - Filter by sensor type
 * @param {string} [params.start_time] - Start time filter
 * @param {string} [params.end_time] - End time filter
 * @param {number} [params.limit] - Limit results
 * @param {string} [params.sort] - Sort order
 * @returns {URLSearchParams} Query parameters
 */
const buildQueryParams = (params) => {
    const queryParams = new URLSearchParams();

    if (params.sensor_box) queryParams.append('sensor_box', params.sensor_box);
    if (params.sensor_type) queryParams.append('sensor_type', params.sensor_type);
    if (params.start_time) queryParams.append('start_time', params.start_time);
    if (params.end_time) queryParams.append('end_time', params.end_time);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sort) queryParams.append('sort', params.sort);

    return queryParams;
};

/**
 * Build API URL with query parameters.
 * @private
 * @param {string} endpoint - API endpoint
 * @param {URLSearchParams} queryParams - Query parameters
 * @returns {string} Complete API URL
 */
const buildApiUrl = (endpoint, queryParams) => {
    const queryString = queryParams.toString();
    return `${endpoint}${queryString ? `?${queryString}` : ''}`;
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Sensors API client functions.
 */
export const sensorsAPI = {
    /**
     * Get sensor data for a specific box
     * @param {string} sensor_box - The ID of the sensor box
     * @param {Object} [params={}] - Additional query parameters
     * @param {string} [params.sensor_type] - Filter by sensor type
     * @param {string} [params.start_time='-24h'] - Start time filter
     * @param {string} [params.end_time='now()'] - End time filter
     * @param {number} [params.limit=500] - Maximum number of records
     * @param {string} [params.sort] - Sort order
     * @returns {Promise<Array>} Array of sensor readings
     */
    getSensorDataByBox: async (sensor_box, params = {}) => {
        const {
            sensor_type,
            start_time = DEFAULT_TIME_RANGE_VALUE,
            end_time = 'now()',
            limit = DEFAULT_DATA_LIMIT,
            sort
        } = params;

        const queryParams = buildQueryParams({
            sensor_type,
            start_time,
            end_time,
            limit,
            sort
        });

        const endpoint = `/sensors/data/box/${encodeURIComponent(sensor_box)}`;
        const url = buildApiUrl(endpoint, queryParams);
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Get list of unique sensor types.
     * @returns {Promise<Array>} Array of sensor type identifiers
     */
    getSensorTypes: async () => {
        const response = await api.get('/sensors/types');
        return response.data;
    },

    /**
     * Export sensor data as CSV file.
     * Downloads a CSV file with sensor data based on the provided filters.
     * @param {Object} [params={}] - Filter parameters
     * @param {string} [params.sensor_box] - Filter by sensor box
     * @param {string} [params.sensor_type] - Filter by sensor type
     * @param {string} [params.start_time] - Start time filter (ISO string)
     * @param {string} [params.end_time] - End time filter (ISO string)
     * @param {number} [params.limit] - Maximum number of records
     * @param {string} [params.sort] - Sort order ('asc' or 'desc')
     * @returns {Promise<void>} Triggers file download
     */
    exportCSV: async (params = {}) => {
        const queryParams = buildQueryParams(params);
        const url = buildApiUrl('/sensors/data/export/csv', queryParams);

        try {
            const response = await api.get(url, {
                responseType: 'blob', // Important for file download
            });

            // Create a blob URL and trigger download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;

            // Extract filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'sensor-data-export.csv';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('CSV export failed:', error);
            throw new Error(error.response?.data?.message || 'Failed to export CSV file');
        }
    }
};

// ============================================================================
// Data Processing Helpers
// ============================================================================

/**
 * Helper functions for processing sensor data.
 */
export const sensorHelpers = {
    /**
     * Group sensor readings by sensor box ID.
     * 
     * @param {Array} data - Array of sensor readings
     * @returns {Object} Object with box IDs as keys and arrays of readings as values
     * 
     * @example
     * const grouped = sensorHelpers.groupByBox(readings);
     * // Returns: { 'box1': [...readings], 'box2': [...readings] }
     */
    groupByBox: (data) => {
        return data.reduce((acc, reading) => {
            const boxId = reading.sensor_box;
            if (!acc[boxId]) {
                acc[boxId] = [];
            }
            acc[boxId].push(reading);
            return acc;
        }, {});
    },

    /**
     * Group sensor readings by sensor type.
     * 
     * @param {Array} data - Array of sensor readings
     * @returns {Object} Object with sensor types as keys and arrays of readings as values
     * 
     * @example
     * const grouped = sensorHelpers.groupByType(readings);
     * // Returns: { 'temperature': [...readings], 'humidity': [...readings] }
     */
    groupByType: (data) => {
        return data.reduce((acc, reading) => {
            const type = reading.sensor_type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(reading);
            return acc;
        }, {});
    },

    /**
     * Get the latest reading for each sensor (unique combination of box and type).
     * 
     * @param {Array} data - Array of sensor readings
     * @returns {Array} Array of latest readings (one per sensor)
     * 
     * @example
     * const latest = sensorHelpers.getLatestReadings(readings);
     * // Returns latest reading for each unique sensor_box + sensor_type combination
     */
    getLatestReadings: (data) => {
        const latest = {};
        data.forEach(reading => {
            const key = `${reading.sensor_box}_${reading.sensor_type}`;
            if (!latest[key] || new Date(reading.timestamp) > new Date(latest[key].timestamp)) {
                latest[key] = reading;
            }
        });
        return Object.values(latest);
    },

    /**
     * Calculate statistics (min, max, avg, count) for sensor readings.
     * 
     * @param {Array} data - Array of sensor readings with 'value' property
     * @returns {Object} Statistics object with min, max, avg, and count
     * 
     * @example
     * const stats = sensorHelpers.calculateStats(readings);
     * // Returns: { min: 20, max: 25, avg: 22.5, count: 10 }
     */
    calculateStats: (data) => {
        if (!data || data.length === 0) {
            return { min: 0, max: 0, avg: 0, count: 0 };
        }

        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i++) {
            const val = parseFloat(data[i].value);
            if (!isNaN(val)) {
                if (val < min) min = val;
                if (val > max) max = val;
                sum += val;
                count++;
            }
        }

        if (count === 0) {
            return { min: 0, max: 0, avg: 0, count: 0 };
        }

        return {
            min,
            max,
            avg: sum / count,
            count
        };
    },

    /**
     * Clear cache (placeholder for future caching implementation).
     * Currently a no-op as there's no cache implementation.
     */
    clearCache: () => {
        // Cache clearing logic can be added here if needed
        // Currently a no-op as there's no cache implementation
    }
};