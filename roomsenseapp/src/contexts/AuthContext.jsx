/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setupAPI } from '../services/setupAPI';
import { DEV_MODE, DEV_USER } from '../config/devConfig';
import { createBootstrapIssue, describeRequestError, isLikelyLocalHttpsTransportFailure } from '../lib/runtimeRecovery';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupLoading, setSetupLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSetupCompleted, setIsSetupCompleted] = useState(null);
    const [bootstrapIssue, setBootstrapIssue] = useState(null);
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
            setBootstrapIssue(null);
            return completed;
        } catch (err) {
            if (err.response?.status === 401) {
                setIsSetupCompleted(null);
                setBootstrapIssue(null);
                return null;
            }

            console.warn('[AuthContext] Failed to get setup status', err);
            setIsSetupCompleted(null);
            setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not verify whether guided setup is complete.'));
            return null;
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
            setBootstrapIssue(null);

            if (refreshSetup) {
                await refreshSetupStatus({ silent: true });
            }

            return userData;
        } catch (err) {
            setUser(null);
            if (err.response?.status === 401) {
                setBootstrapIssue(null);
            } else {
                setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not validate your current session.'));
            }
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

            try {
                await authAPI.getCsrfToken();
            } catch (err) {
                console.warn('Failed to fetch CSRF token on init', err);
                if (isLikelyLocalHttpsTransportFailure(err)) {
                    setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not reach its local HTTPS bootstrap endpoint.'));
                }
            }

            const authenticatedUser = await checkAuth({ showLoading: true });

            if (authenticatedUser) {
                await refreshSetupStatus();
            } else {
                setIsSetupCompleted(null);
                setSetupLoading(false);
            }
        };

        initAuth();
    }, [checkAuth, refreshSetupStatus]);

    useEffect(() => {
        if (DEV_MODE || !authenticatedUserId) {
            return;
        }

        const syncAuthenticatedState = async () => {
            const authenticatedUser = await checkAuth({ showLoading: false });
            if (!authenticatedUser) {
                setIsSetupCompleted(null);
                setSetupLoading(false);
                return;
            }

            await refreshSetupStatus({ silent: true });
        };

        syncAuthenticatedState();
    }, [location.pathname, authenticatedUserId, checkAuth, refreshSetupStatus]);

    const login = async (username, password) => {
        try {
            setError(null);
            setBootstrapIssue(null);
            const userData = await authAPI.login(username, password);
            setUser(userData);
            const setupCompleted = await refreshSetupStatus({ silent: true });
            return { success: true, setupCompleted };
        } catch (err) {
            console.error('[AuthContext] Login error:', err);
            const errorMessage = describeRequestError(err, 'Login failed');
            setError(errorMessage);
            if (isLikelyLocalHttpsTransportFailure(err)) {
                setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not complete the local HTTPS login flow.'));
            }
            return { success: false, error: errorMessage };
        }
    };

    const register = async (username, password) => {
        try {
            setError(null);
            setBootstrapIssue(null);
            await authAPI.register(username, password);
            return await login(username, password);
        } catch (err) {
            console.error('[AuthContext] Registration error:', err);
            const errorMessage = describeRequestError(err, 'Registration failed');
            setError(errorMessage);
            if (isLikelyLocalHttpsTransportFailure(err)) {
                setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not complete the local HTTPS registration flow.'));
            }
            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
            setUser(null);
            setError(null);
            setIsSetupCompleted(null);
            setSetupLoading(false);
            setBootstrapIssue(null);
        } catch (err) {
            console.error('Logout error:', err);
            // Even if server logout fails, clear client state.
            setUser(null);
            setIsSetupCompleted(null);
            setSetupLoading(false);
            setBootstrapIssue(null);
        }
    };

    const hasRole = (role) => user?.role === role;
    const hasAnyRole = (roles) => roles.includes(user?.role);

    const value = {
        user,
        loading,
        setupLoading,
        error,
        bootstrapIssue,
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
