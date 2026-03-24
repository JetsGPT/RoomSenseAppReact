import { lazy } from 'react';

export const LOCAL_CERTIFICATE_DOWNLOAD_PATH = '/ca.crt';
const CHUNK_RELOAD_KEY_PREFIX = 'roomsense:chunk-reload';

export function getLocalCertificateDownloadUrl() {
    return LOCAL_CERTIFICATE_DOWNLOAD_PATH;
}

export function describeRequestError(error, fallbackMessage) {
    if (error?.response) {
        const responseMessage = error.response.data?.error || error.response.data?.message || JSON.stringify(error.response.data);
        return `Server error (${error.response.status}): ${responseMessage}`;
    }

    if (error?.request) {
        return `No response from server: ${error.message || 'Connection failed'}`;
    }

    return error?.message || fallbackMessage;
}

export function isChunkLoadError(error) {
    const message = String(error?.message || error || '');
    return /ChunkLoadError/i.test(message)
        || /Loading chunk [\d]+ failed/i.test(message)
        || /Failed to fetch dynamically imported module/i.test(message);
}

export function lazyWithRetry(importer, chunkKey) {
    const reloadKey = `${CHUNK_RELOAD_KEY_PREFIX}:${chunkKey}`;

    return lazy(() => importer()
        .then((module) => {
            if (typeof window !== 'undefined') {
                window.sessionStorage.removeItem(reloadKey);
            }

            return module;
        })
        .catch((error) => {
            if (typeof window !== 'undefined' && isChunkLoadError(error)) {
                const alreadyReloaded = window.sessionStorage.getItem(reloadKey) === '1';
                if (!alreadyReloaded) {
                    window.sessionStorage.setItem(reloadKey, '1');
                    window.location.reload();
                    return new Promise(() => {});
                }

                window.sessionStorage.removeItem(reloadKey);
            }

            throw error;
        }));
}
