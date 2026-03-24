/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setupAPI } from '../services/setupAPI';
import { DEV_MODE, DEV_USER } from '../config/devConfig';
import { createBootstrapIssue, describeRequestError, isLikelyLocalHttpsTransportFailure } from '../lib/runtimeRecovery';

const AuthContext = createContext(null);

function normalizeBootstrapState(payload) {
    const rawCompleted = payload?.setupCompleted ?? payload?.completed;
    const setupCompleted = typeof rawCompleted === 'boolean' ? rawCompleted : null;

    let hasUsers = null;
    if (typeof payload?.hasUsers === 'boolean') {
        hasUsers = payload.hasUsers;
    } else if (payload?.firstInstall === true) {
        hasUsers = false;
    } else if (payload?.firstInstall === false && setupCompleted === false) {
        hasUsers = true;
    }

    return {
        setupCompleted,
        hasUsers,
    };
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupLoading, setSetupLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSetupCompleted, setIsSetupCompleted] = useState(null);
    const [hasUsers, setHasUsers] = useState(null);
    const [bootstrapIssue, setBootstrapIssue] = useState(null);
    const location = useLocation();
    const hasInitialized = useRef(false);
    const authenticatedUserId = user?.id;

    const applyBootstrapState = useCallback((payload) => {
        const { setupCompleted, hasUsers: nextHasUsers } = normalizeBootstrapState(payload);
        setIsSetupCompleted(setupCompleted);
        setHasUsers(nextHasUsers);
        return setupCompleted;
    }, []);

    const refreshSetupStatus = useCallback(async ({ silent = false } = {}) => {
        if (DEV_MODE) {
            setIsSetupCompleted(true);
            setHasUsers(true);
            setSetupLoading(false);
            return true;
        }

        if (!silent) {
            setSetupLoading(true);
        }

        try {
            const setupRes = await setupAPI.getBootstrap();
            const completed = applyBootstrapState(setupRes);
            setBootstrapIssue(null);
            return completed;
        } catch (err) {
            console.warn('[AuthContext] Failed to get setup bootstrap state', err);
            setIsSetupCompleted(null);
            setHasUsers(null);
            setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not verify whether guided setup is complete.'));
            return null;
        } finally {
            if (!silent) {
                setSetupLoading(false);
            }
        }
    }, [applyBootstrapState]);

    const checkAuth = useCallback(async ({ showLoading = true } = {}) => {
        if (DEV_MODE) {
            setUser(DEV_USER);
            setError(null);
            setIsSetupCompleted(true);
            setHasUsers(true);
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
            return userData;
        } catch (err) {
            setUser(null);
            if (err.response?.status !== 401) {
                setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not validate your current session.'));
            }
            return null;
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, []);

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
                setHasUsers(true);
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

            try {
                await Promise.all([
                    checkAuth({ showLoading: false }),
                    refreshSetupStatus(),
                ]);
            } finally {
                setLoading(false);
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

    const createInitialAccount = async (username, password) => {
        try {
            setError(null);
            setBootstrapIssue(null);
            const response = await setupAPI.createInitialAccount(username, password);
            const userData = response?.user ?? response;
            setUser(userData);
            const setupCompleted = await refreshSetupStatus({ silent: true });
            return { success: true, setupCompleted, user: userData };
        } catch (err) {
            console.error('[AuthContext] Initial account creation error:', err);
            const errorMessage = describeRequestError(err, 'Failed to create the initial setup account');
            setError(errorMessage);
            if (isLikelyLocalHttpsTransportFailure(err)) {
                setBootstrapIssue(createBootstrapIssue(err, 'RoomSense could not complete the local HTTPS setup account flow.'));
            }
            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            setError(null);
            setBootstrapIssue(null);
            await refreshSetupStatus({ silent: true });
        }
    };

    const hasRole = (role) => user?.role === role;
    const hasAnyRole = (roles) => roles.includes(user?.role);
    const isFirstInstall = isSetupCompleted === false && hasUsers === false
        ? true
        : isSetupCompleted === null || hasUsers === null
            ? null
            : false;

    const value = {
        user,
        loading,
        setupLoading,
        error,
        bootstrapIssue,
        isSetupCompleted,
        hasUsers,
        isFirstInstall,
        setIsSetupCompleted,
        refreshSetupStatus,
        login,
        register,
        createInitialAccount,
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
