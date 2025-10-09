import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();

    // Check if user is already logged in on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Re-validate session on every route change
    useEffect(() => {
        if (user) {
            // Only check auth if we think we're logged in
            // This prevents unnecessary calls when user is already null
            // Don't show loading spinner for route change validations
            checkAuth(false);
        }
    }, [location.pathname]);

    const checkAuth = async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
            setError(null);
        } catch (err) {
            // User is not logged in or session expired
            setUser(null);
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    const login = async (username, password) => {
        try {
            setError(null);
            const userData = await authAPI.login(username, password);
            setUser(userData);
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Login failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const register = async (username, password, role = 'user') => {
        try {
            setError(null);
            await authAPI.register(username, password, role);
            // After registration, log the user in
            return await login(username, password);
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Registration failed';
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
            // Even if server logout fails, clear client state
            setUser(null);
        }
    };

    const hasRole = (role) => {
        return user?.role === role;
    };

    const hasAnyRole = (roles) => {
        return roles.includes(user?.role);
    };

    const value = {
        user,
        loading,
        error,
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

