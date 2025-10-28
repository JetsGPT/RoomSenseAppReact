import axios from 'axios';

// Hardcoded Sensors API base URL
const SENSORS_API_BASE_URL = 'https://localhost:8081/api';

// Create axios instance
const api = axios.create({
    baseURL: SENSORS_API_BASE_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Sensors API calls
export const sensorsAPI = {
    // Get all sensor data with optional filtering
    getSensorData: async (params = {}) => {
        const { 
            sensor_box, 
            sensor_type, 
            start_time = '-24h', 
            end_time = 'now()', 
            limit = 500 
        } = params;
        
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
        const { 
            sensor_type, 
            start_time = '-24h', 
            end_time = 'now()', 
            limit = 500 
        } = params;
        
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
        const { 
            sensor_box, 
            start_time = '-24h', 
            end_time = 'now()', 
            limit = 500 
        } = params;
        
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
    }
};

// Helper functions for data processing
export const sensorHelpers = {
    // Group data by sensor box
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

    // Group data by sensor type
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

    // Get latest readings for each sensor
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

    // Calculate statistics
    calculateStats: (data) => {
        if (data.length === 0) return { min: 0, max: 0, avg: 0, count: 0 };
        
        const values = data.map(d => d.value).filter(v => !isNaN(v));
        if (values.length === 0) return { min: 0, max: 0, avg: 0, count: 0 };
        
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            count: values.length
        };
    }
};