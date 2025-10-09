import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * RequireAuth - Protects routes that require any authenticated user
 * Relies solely on server-side session validation
 */
export const RequireAuth = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        // Redirect to login but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

/**
 * RequireRole - Protects routes that require specific role(s)
 * Note: This is just UI protection - server must verify roles on all API calls
 */
export const RequireRole = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has one of the required roles
    const hasRequiredRole = Array.isArray(roles)
        ? roles.includes(user.role)
        : user.role === roles;

    if (!hasRequiredRole) {
        // User is authenticated but doesn't have required role
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

/**
 * PublicOnly - Redirects authenticated users away from public pages (like login)
 */
export const PublicOnly = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

