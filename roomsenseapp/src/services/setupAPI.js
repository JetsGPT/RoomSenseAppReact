import api from './api';

export const setupAPI = {
    /**
     * Check if the guided setup has been completed
     */
    getStatus: async () => {
        const response = await api.get('/setup/status');
        return response.data;
    },

    /**
     * Fetch temporary system backend credentials
     */
    getCredentials: async () => {
        const response = await api.get('/setup/credentials');
        return response.data; // Expected to be string/blob from txt file
    },

    /**
     * Mark the system setup as complete, which deletes the temporary credentials file.
     */
    completeSetup: async () => {
        const response = await api.post('/setup/complete');
        return response.data;
    }
    
    // Note: Certificates are usually downloaded via window.open('/api/setup/certificate')
    // instead of an axios API call so the browser handles the download popup.
};
