import { lazy } from 'react';

export const LOCAL_CERTIFICATE_DOWNLOAD_PATH = '/ca.crt';
const CHUNK_RELOAD_KEY_PREFIX = 'roomsense:chunk-reload';

function getCurrentOrigin() {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'https://roomsense.local';
}

function resolveRequestUrl(error) {
    const baseUrl = error?.config?.baseURL || getCurrentOrigin();
    const requestUrl = error?.config?.url || baseUrl;

    try {
        return new URL(requestUrl, baseUrl);
    } catch {
        return null;
    }
}

export function getLocalCertificateDownloadUrl() {
    return LOCAL_CERTIFICATE_DOWNLOAD_PATH;
}

export function isLikelyLocalHttpsTransportFailure(error) {
    if (!error || error.response) {
        return false;
    }

    const code = String(error.code || '');
    const message = String(error.message || '');

    if (code !== 'ERR_NETWORK' && !/network error/i.test(message)) {
        return false;
    }

    const requestUrl = resolveRequestUrl(error);
    if (!requestUrl) {
        return typeof window !== 'undefined' && window.location.protocol === 'https:';
    }

    if (typeof window === 'undefined') {
        return requestUrl.protocol === 'https:';
    }

    return requestUrl.protocol === 'https:' && requestUrl.origin === window.location.origin;
}

export function buildLocalHttpsRecoveryMessage(prefix = 'RoomSense could not reach the local HTTPS API.') {
    return `${prefix} After a factory reset, RoomSense creates a new local certificate authority. Download the current certificate from this box, install it on this device, then reload the page.`;
}

export function describeRequestError(error, fallbackMessage) {
    if (error?.response) {
        const responseMessage = error.response.data?.error || error.response.data?.message || JSON.stringify(error.response.data);
        return `Server error (${error.response.status}): ${responseMessage}`;
    }

    if (isLikelyLocalHttpsTransportFailure(error)) {
        return buildLocalHttpsRecoveryMessage('RoomSense could not verify the local HTTPS service.');
    }

    if (error?.request) {
        return `No response from server: ${error.message || 'Connection failed'}`;
    }

    return error?.message || fallbackMessage;
}

export function createBootstrapIssue(error, fallbackMessage) {
    const likelyTrustIssue = isLikelyLocalHttpsTransportFailure(error);

    return {
        title: likelyTrustIssue ? 'Install the current RoomSense certificate' : 'RoomSense is still starting',
        message: likelyTrustIssue
            ? buildLocalHttpsRecoveryMessage(fallbackMessage)
            : describeRequestError(error, fallbackMessage),
        isLikelyTrustIssue: likelyTrustIssue,
    };
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
