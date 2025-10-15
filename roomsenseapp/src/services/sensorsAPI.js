import axios from 'axios';

const API_BASE_URL = 'https://localhost:8081/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Sensors API calls
export const sensorsAPI = {
    // Get all sensor data with optional filtering
    getSensorData: async (params = {}) => {
        const { sensor_box, sensor_type, start_time, end_time, limit } = params;
        
        const queryParams = new URLSearchParams();
        if (sensor_box) queryParams.append('sensor_box', sensor_box);
        if (sensor_type) queryParams.append('sensor_type', sensor_type);
        if (start_time) queryParams.append('start_time', start_time);
        if (end_time) queryParams.append('end_time', end_time);
        if (limit) queryParams.append('limit', limit);
        
        const queryString = queryParams.toString();
        const url = `/sensors/data${queryString ? `?${queryString}` : ''}`;
        
        const response = await api.get(url);
        return response.data;
    },

    // Get data by sensor box
    getSensorDataByBox: async (sensor_box, params = {}) => {
        const { sensor_type, start_time, end_time, limit } = params;
        
        const queryParams = new URLSearchParams();
        if (sensor_type) queryParams.append('sensor_type', sensor_type);
        if (start_time) queryParams.append('start_time', start_time);
        if (end_time) queryParams.append('end_time', end_time);
        if (limit) queryParams.append('limit', limit);
        
        const queryString = queryParams.toString();
        const url = `/sensors/data/box/${encodeURIComponent(sensor_box)}${queryString ? `?${queryString}` : ''}`;
        
        const response = await api.get(url);
        return response.data;
    },

    // Get data by sensor type
    getSensorDataByType: async (sensor_type, params = {}) => {
        const { sensor_box, start_time, end_time, limit } = params;
        
        const queryParams = new URLSearchParams();
        if (sensor_box) queryParams.append('sensor_box', sensor_box);
        if (start_time) queryParams.append('start_time', start_time);
        if (end_time) queryParams.append('end_time', end_time);
        if (limit) queryParams.append('limit', limit);
        
        const queryString = queryParams.toString();
        const url = `/sensors/data/type/${encodeURIComponent(sensor_type)}${queryString ? `?${queryString}` : ''}`;
        
        const response = await api.get(url);
        return response.data;
    },

    // Get unique sensor boxes
    getSensorBoxes: async () => {
        const response = await api.get('/sensors/boxes');
        return response.data;
    },

    // Get unique sensor types
    getSensorTypes: async () => {
        const response = await api.get('/sensors/types');
        return response.data;
    },

    // Write sensor data
    writeSensorData: async (sensorData) => {
        const response = await api.post('/sensors/data', sensorData);
        return response.data;
    },

    // Write test data
    writeTestData: async () => {
        const response = await api.get('/sensors/writeTestData');
        return response.data;
    },
};

// Helper functions for common sensor operations
export const sensorHelpers = {
    // Format date for API calls
    formatDate: (date) => {
        if (!date) return null;
        if (date instanceof Date) {
            return date.toISOString();
        }
        return new Date(date).toISOString();
    },

    // Get data for last N hours
    getLastNHours: async (hours = 24, params = {}) => {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
        
        return await sensorsAPI.getSensorData({
            ...params,
            start_time: sensorHelpers.formatDate(startTime),
            end_time: sensorHelpers.formatDate(endTime),
        });
    },

    // Get data for last N days
    getLastNDays: async (days = 7, params = {}) => {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));
        
        return await sensorsAPI.getSensorData({
            ...params,
            start_time: sensorHelpers.formatDate(startTime),
            end_time: sensorHelpers.formatDate(endTime),
        });
    },

    // Get real-time data (last 5 minutes)
    getRealTimeData: async (params = {}) => {
        return await sensorHelpers.getLastNHours(5/60, params); // 5 minutes
    },

    // Validate sensor data before sending
    validateSensorData: (data) => {
        const errors = [];
        
        if (!data.sensor_box || typeof data.sensor_box !== 'string') {
            errors.push('sensor_box is required and must be a string');
        }
        
        if (!data.sensor_type || typeof data.sensor_type !== 'string') {
            errors.push('sensor_type is required and must be a string');
        }
        
        if (data.value === undefined || data.value === null) {
            errors.push('value is required');
        }
        
        if (typeof data.value !== 'number' || isNaN(data.value)) {
            errors.push('value must be a valid number');
        }
        
        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
        
        return data;
    },
};

export default sensorsAPI;
