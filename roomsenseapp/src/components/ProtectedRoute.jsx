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

/**
 * RequireSetup - Protects all routes from being accessed before the Guided Setup is completed.
 * Forces the user into the /setup flow if the backend DB flag is false.
 */
export const RequireSetup = ({ children }) => {
    const { isSetupCompleted, loading } = useAuth();
    const location = useLocation();

    // If still parsing DB status
    if (loading || isSetupCompleted === null) {
        return <div className="flex items-center justify-center min-h-screen">Loading System Configuration...</div>;
    }

    // Force redirection if Guided Setup hasn't run yet
    if (isSetupCompleted === false) {
        return <Navigate to="/setup" state={{ from: location }} replace />;
    }

    return children;
};

