/**
 * Sensors API service
 * 
 * Provides functions for interacting with the sensors API backend.
 * Handles data fetching, filtering, and helper operations.
 */

import axios from 'axios';
import { DEV_MODE, DEV_SYSTEM_HEALTH, getMockSensorData, resolveMockSensorBoxId } from '../config/devConfig';
import { DEFAULT_TIME_RANGE_VALUE, DEFAULT_DATA_LIMIT } from '../config/sensorConfig';
import { calculateDewPoint } from '../lib/correlationUtils';

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

const DEV_SENSOR_TYPES = ['temperature', 'humidity', 'pressure', 'light'];

function parseMockTimeBoundary(value, fallbackTimestamp) {
    if (!value || value === 'now()') {
        return fallbackTimestamp;
    }

    const relativeMatch = String(value).trim().match(/^-(\d+)([mhd])$/i);
    if (relativeMatch) {
        const [, rawAmount, rawUnit] = relativeMatch;
        const amount = Number(rawAmount);
        const multipliers = {
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        return fallbackTimestamp - (amount * multipliers[rawUnit.toLowerCase()]);
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : fallbackTimestamp;
}

function getMockBoxReadings(sensorBox, params = {}) {
    const resolvedBoxId = resolveMockSensorBoxId(sensorBox);
    const {
        sensor_type,
        start_time,
        end_time,
        limit,
        sort = 'desc',
    } = params;

    const now = Date.now();
    const startTimestamp = parseMockTimeBoundary(start_time, now - (24 * 60 * 60 * 1000));
    const endTimestamp = parseMockTimeBoundary(end_time, now);

    let readings = getMockSensorData().filter((reading) => reading.sensor_box === resolvedBoxId);

    if (sensor_type) {
        readings = readings.filter((reading) => reading.sensor_type === sensor_type);
    }

    readings = readings.filter((reading) => {
        const timestamp = new Date(reading.timestamp).getTime();
        return Number.isFinite(timestamp) && timestamp >= startTimestamp && timestamp <= endTimestamp;
    });

    readings.sort((left, right) => {
        const difference = new Date(right.timestamp) - new Date(left.timestamp);
        return sort === 'desc' ? difference : -difference;
    });

    return typeof limit === 'number' ? readings.slice(0, limit) : readings;
}

function aggregateMockReadingsByDay(readings, aggregation = 'mean') {
    const dayMap = new Map();

    readings.forEach((reading) => {
        const dayKey = String(reading.timestamp).slice(0, 10);
        if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, []);
        }

        dayMap.get(dayKey).push(Number(reading.value));
    });

    return Array.from(dayMap.entries())
        .map(([date, values]) => {
            const validValues = values.filter((value) => Number.isFinite(value));
            if (!validValues.length) {
                return null;
            }

            let value;
            switch (aggregation) {
                case 'min':
                    value = Math.min(...validValues);
                    break;
                case 'max':
                    value = Math.max(...validValues);
                    break;
                case 'last':
                    value = validValues[validValues.length - 1];
                    break;
                default:
                    value = validValues.reduce((sum, current) => sum + current, 0) / validValues.length;
                    break;
            }

            return {
                date,
                value: Number(value.toFixed(2)),
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.date.localeCompare(right.date));
}

function buildMockMoldRisk(sensorBox) {
    const latestReadings = sensorHelpers.getLatestReadings(getMockBoxReadings(sensorBox));
    const temperature = Number(latestReadings.find((reading) => reading.sensor_type === 'temperature')?.value);
    const humidity = Number(latestReadings.find((reading) => reading.sensor_type === 'humidity')?.value);
    const dewPoint = calculateDewPoint(temperature, humidity);

    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
        return {
            status: 'green',
            riskScore: 10,
            explanation: 'Not enough mock temperature and humidity data is available yet.',
            dangerDurationHours: 0,
            warningDurationHours: 0,
            isStale: false,
        };
    }

    let status = 'green';
    let riskScore = Math.min(100, Math.max(5, Math.round(((humidity - 35) * 1.8) + ((dewPoint ?? 0) * 1.4))));
    let explanation = `Humidity is stable at ${humidity.toFixed(0)}% with a dew point near ${dewPoint?.toFixed(1) ?? 'n/a'} C.`;
    let dangerDurationHours = 0;
    let warningDurationHours = 0;

    if (humidity >= 72 || (dewPoint ?? -Infinity) >= 18) {
        status = 'red';
        riskScore = Math.max(riskScore, 82);
        dangerDurationHours = 3;
        warningDurationHours = 8;
        explanation = `Sustained humidity around ${humidity.toFixed(0)}% suggests elevated mold risk in ${resolveMockSensorBoxId(sensorBox)}.`;
    } else if (humidity >= 60 || (dewPoint ?? -Infinity) >= 15) {
        status = 'yellow';
        riskScore = Math.max(riskScore, 52);
        warningDurationHours = 4;
        explanation = `Humidity is trending high at ${humidity.toFixed(0)}%. Keep an eye on airflow and colder surfaces.`;
    }

    return {
        status,
        riskScore,
        explanation,
        dangerDurationHours,
        warningDurationHours,
        isStale: false,
    };
}

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
        if (DEV_MODE) {
            return getMockBoxReadings(sensor_box, params);
        }

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
     * Get aggregated daily data for heatmap.
     * @param {string} sensor_box - The ID of the sensor box
     * @param {string} sensor_type - The sensor type
     * @param {Object} [params={}] - Additional query parameters (start_time, end_time, aggregation)
     * @returns {Promise<Array>} Array of { date, value } objects
     */
    getAggregatedData: async (sensor_box, sensor_type, params = {}) => {
        if (DEV_MODE) {
            const {
                start_time = '-365d',
                end_time = 'now()',
                aggregation = 'mean'
            } = params;

            const readings = getMockBoxReadings(sensor_box, {
                sensor_type,
                start_time,
                end_time,
                sort: 'asc',
            });

            return aggregateMockReadingsByDay(readings, aggregation);
        }

        const { start_time = '-365d', end_time = 'now()', aggregation = 'mean' } = params;
        // manually build query params for specific endpoint args
        const queryParams = new URLSearchParams();
        if (start_time) queryParams.append('start_time', start_time);
        if (end_time) queryParams.append('end_time', end_time);
        if (aggregation) queryParams.append('aggregation', aggregation);

        const url = `/sensors/data/aggregated/${encodeURIComponent(sensor_box)}/${encodeURIComponent(sensor_type)}?${queryParams.toString()}`;
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Get list of unique sensor boxes.
     * @returns {Promise<Array>} Array of sensor box identifiers
     */
    getSensorBoxes: async () => {
        if (DEV_MODE) {
            return Array.from(new Set(getMockSensorData().map((reading) => reading.sensor_box))).sort();
        }

        const response = await api.get('/sensors/boxes');
        return response.data;
    },

    /**
     * Get list of unique sensor types.
     * @returns {Promise<Array>} Array of sensor type identifiers
     */
    getSensorTypes: async () => {
        if (DEV_MODE) {
            return DEV_SENSOR_TYPES;
        }

        const response = await api.get('/sensors/types');
        return response.data;
    },

    /**
     * Get mold risk assessment for a specific box.
     * @param {string} sensor_box - The ID of the sensor box
     * @returns {Promise<Object>} Mold risk assessment object
     */
    getMoldRisk: async (sensor_box) => {
        if (DEV_MODE) {
            return buildMockMoldRisk(sensor_box);
        }

        const response = await api.get(`/sensors/data/mold-risk/${encodeURIComponent(sensor_box)}`);
        return response.data;
    },

    /**
     * Get system health status for all active devices.
     * @returns {Promise<Array>} Array of device health objects
     */
    getSystemHealth: async () => {
        if (DEV_MODE) return DEV_SYSTEM_HEALTH;
        const response = await api.get('/sensors/health-status');
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
