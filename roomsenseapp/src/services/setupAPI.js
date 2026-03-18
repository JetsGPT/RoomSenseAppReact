import api from './api';

const buildSetupUrl = (path) => {
    const baseUrl = (api.defaults.baseURL || '/api').replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

export const setupAPI = {
    /**
     * Check if the guided setup has been completed.
     */
    getStatus: async () => {
        const response = await api.get('/setup/status');
        return response.data;
    },

    /**
     * Fetch temporary system backend credentials.
     */
    getCredentials: async () => {
        const response = await api.get('/setup/credentials', { responseType: 'text' });
        return response.data;
    },

    /**
     * Build the download URL for the temporary root certificate.
     */
    getCertificateDownloadUrl: () => buildSetupUrl('/setup/certificate'),

    /**
     * Mark the system setup as complete, which deletes the temporary credentials file.
     */
    completeSetup: async () => {
        const response = await api.post('/setup/complete');
        return response.data;
    }
};
