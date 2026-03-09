import api from './api';

/**
 * Weather API service
 * Uses the configured 'api' instance to ensure CSRF tokens and credentials are sent.
 */
export const weatherAPI = {
    /** Get current weather data */
    getCurrent: async (latitude, longitude) => {
        const params = {};
        if (latitude != null) params.latitude = latitude;
        if (longitude != null) params.longitude = longitude;
        const response = await api.get('/weather/current', { params });
        return response.data;
    },

    /** Get historical weather data */
    getHistorical: async (latitude, longitude, startDate, endDate) => {
        const params = { start_date: startDate, end_date: endDate };
        if (latitude != null) params.latitude = latitude;
        if (longitude != null) params.longitude = longitude;
        const response = await api.get('/weather/historical', { params });
        return response.data;
    },

    /** Get the saved weather location */
    getLocation: async () => {
        const response = await api.get('/weather/location');
        return response.data;
    },

    /** Save a weather location */
    setLocation: async (latitude, longitude, name) => {
        const response = await api.put('/weather/location', {
            latitude, longitude, name
        });
        return response.data;
    },

    /** Search for cities/locations */
    geocode: async (query) => {
        const response = await api.get('/weather/geocode', {
            params: { q: query }
        });
        return response.data;
    }
};


