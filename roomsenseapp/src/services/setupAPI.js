import api from './api';
import { getLocalCertificateDownloadUrl } from '../lib/runtimeRecovery';

export const setupAPI = {
    /**
     * Fetch public bootstrap state before authentication.
     */
    getBootstrap: async () => {
        const response = await api.get('/setup/bootstrap');
        return response.data;
    },

    /**
     * Check if the guided setup has been completed.
     */
    getStatus: async () => {
        const response = await api.get('/setup/status');
        return response.data;
    },

    /**
     * Create the first setup account and start a session.
     */
    createInitialAccount: async (user, password) => {
        const response = await api.post('/setup/initial-account', { user, password });
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
     * Build the download URL for the current public RoomSense root certificate.
     */
    getCertificateDownloadUrl: () => getLocalCertificateDownloadUrl(),

    /**
     * Mark the system setup as complete, which deletes the temporary credentials file.
     */
    completeSetup: async () => {
        const response = await api.post('/setup/complete');
        return response.data;
    }
};
