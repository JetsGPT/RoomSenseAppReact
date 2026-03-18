/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setupAPI } from '../services/setupAPI';
import { DEV_MODE, DEV_USER } from '../config/devConfig';

const AuthContext = createContext(null);
const FALLBACK_SETUP_STATUS = true;

const buildRequestErrorMessage = (err, fallbackMessage) => {
    let errorMessage = fallbackMessage;

    if (err.response) {
        errorMessage = `Server error (${err.response.status}): ${err.response.data?.error || err.response.data?.message || JSON.stringify(err.response.data)}`;
    } else if (err.request) {
        errorMessage = `No response from server: ${err.message || 'Connection failed'}`;
    } else {
        errorMessage = `Request error: ${err.message || 'Unknown error'}`;
    }

    if (err.code) {
        errorMessage += ` (Code: ${err.code})`;
    }

    return errorMessage;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupLoading, setSetupLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSetupCompleted, setIsSetupCompleted] = useState(null);
    const location = useLocation();
    const hasInitialized = useRef(false);
    const authenticatedUserId = user?.id;

    const refreshSetupStatus = useCallback(async ({ silent = false } = {}) => {
        if (DEV_MODE) {
            setIsSetupCompleted(true);
            setSetupLoading(false);
            return true;
        }

        if (!silent) {
            setSetupLoading(true);
        }

        try {
            const setupRes = await setupAPI.getStatus();
            const completed = Boolean(setupRes?.completed);
            setIsSetupCompleted(completed);
            return completed;
        } catch (err) {
            console.warn('[AuthContext] Failed to get setup status', err);
            // Fail-safe to avoid soft locks if setup status is temporarily unavailable.
            setIsSetupCompleted(FALLBACK_SETUP_STATUS);
            return FALLBACK_SETUP_STATUS;
        } finally {
            if (!silent) {
                setSetupLoading(false);
            }
        }
    }, []);

    const checkAuth = useCallback(async ({ showLoading = true, refreshSetup = false } = {}) => {
        if (DEV_MODE) {
            setUser(DEV_USER);
            setError(null);
            setIsSetupCompleted(true);
            setSetupLoading(false);
            setLoading(false);
            return DEV_USER;
        }

        if (showLoading) {
            setLoading(true);
        }

        try {
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
            setError(null);

            if (refreshSetup) {
                await refreshSetupStatus({ silent: true });
            }

            return userData;
        } catch {
            setUser(null);
            return null;
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [refreshSetupStatus]);

    useEffect(() => {
        if (hasInitialized.current) {
            return;
        }

        hasInitialized.current = true;

        const initAuth = async () => {
            if (DEV_MODE) {
                setUser(DEV_USER);
                setError(null);
                setIsSetupCompleted(true);
                setSetupLoading(false);
                setLoading(false);
                return;
            }

            await refreshSetupStatus();

            try {
                await authAPI.getCsrfToken();
            } catch (err) {
                console.warn('Failed to fetch CSRF token on init', err);
            }

            await checkAuth({ showLoading: true });
        };

        initAuth();
    }, [checkAuth, refreshSetupStatus]);

    useEffect(() => {
        if (DEV_MODE || !authenticatedUserId) {
            return;
        }

        checkAuth({ showLoading: false });
        refreshSetupStatus({ silent: true });
    }, [location.pathname, authenticatedUserId, checkAuth, refreshSetupStatus]);

    const login = async (username, password) => {
        try {
            setError(null);
            const userData = await authAPI.login(username, password);
            setUser(userData);
            const setupCompleted = await refreshSetupStatus({ silent: true });
            return { success: true, setupCompleted };
        } catch (err) {
            console.error('[AuthContext] Login error:', err);
            const errorMessage = buildRequestErrorMessage(err, 'Login failed');
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const register = async (username, password) => {
        try {
            setError(null);
            await authAPI.register(username, password);
            return await login(username, password);
        } catch (err) {
            console.error('[AuthContext] Registration error:', err);
            const errorMessage = buildRequestErrorMessage(err, 'Registration failed');
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
            setUser(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            // Even if server logout fails, clear client state.
            setUser(null);
        }
    };

    const hasRole = (role) => user?.role === role;
    const hasAnyRole = (roles) => roles.includes(user?.role);

    const value = {
        user,
        loading,
        setupLoading,
        error,
        isSetupCompleted,
        setIsSetupCompleted,
        refreshSetupStatus,
        login,
        register,
        logout,
        checkAuth,
        hasRole,
        hasAnyRole,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
