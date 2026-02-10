import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Weather API service
 */
export const weatherAPI = {
    /**
     * Get current weather data
     * @param {number} latitude 
     * @param {number} longitude 
     * @returns {Promise<Object>} Current weather data
     */
    getCurrent: async (latitude, longitude) => {
        const response = await axios.get(`${API_BASE_URL}/weather/current`, {
            params: { latitude, longitude }
        });
        return response.data;
    },

    /**
     * Get historical weather data
     * @param {number} latitude 
     * @param {number} longitude 
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {Promise<Object>} Historical weather data
     */
    getHistorical: async (latitude, longitude, startDate, endDate) => {
        const response = await axios.get(`${API_BASE_URL}/weather/historical`, {
            params: {
                latitude,
                longitude,
                start_date: startDate,
                end_date: endDate
            }
        });
        return response.data;
    }
};
