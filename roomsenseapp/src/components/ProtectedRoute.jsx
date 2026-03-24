import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BootstrapRecoveryPanel from '../shared/components/BootstrapRecoveryPanel';

const RouteLoader = ({ message }) => (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{message}</span>
        </div>
    </div>
);

const RouteRecovery = ({ issue }) => (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
        <BootstrapRecoveryPanel issue={issue} className="w-full max-w-2xl" />
    </div>
);

/**
 * RequireAuth - Protects routes that require any authenticated user.
 * Relies solely on server-side session validation.
 */
export const RequireAuth = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <RouteLoader message="Checking session..." />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

/**
 * RequireRole - Protects routes that require specific role(s).
 * Note: This is just UI protection - server must verify roles on all API calls.
 */
export const RequireRole = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <RouteLoader message="Checking permissions..." />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const hasRequiredRole = Array.isArray(roles)
        ? roles.includes(user.role)
        : user.role === roles;

    if (!hasRequiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

/**
 * PublicOnly - Redirects authenticated users away from public pages (like login).
 */
export const PublicOnly = ({ children }) => {
    const { user, loading, setupLoading, isSetupCompleted, isFirstInstall, bootstrapIssue } = useAuth();

    if (loading || setupLoading) {
        return <RouteLoader message="Loading account..." />;
    }

    if (isSetupCompleted === null && bootstrapIssue) {
        return <RouteRecovery issue={bootstrapIssue} />;
    }

    if (isSetupCompleted === null) {
        return <RouteLoader message="Loading account..." />;
    }

    if (user) {
        return <Navigate to={isSetupCompleted === false ? '/setup' : '/dashboard'} replace />;
    }

    if (isFirstInstall === true) {
        return <Navigate to="/setup" replace />;
    }

    return children;
};

/**
 * RequireSetup - Protects routes that should remain locked until setup completes.
 */
export const RequireSetup = ({ children }) => {
    const { user, loading, setupLoading, isSetupCompleted, isFirstInstall, bootstrapIssue } = useAuth();
    const location = useLocation();

    if (loading || setupLoading) {
        return <RouteLoader message="Loading system configuration..." />;
    }

    if (isSetupCompleted === null && bootstrapIssue) {
        return <RouteRecovery issue={bootstrapIssue} />;
    }

    if (isSetupCompleted === null) {
        return <RouteLoader message="Loading system configuration..." />;
    }

    if (!user) {
        if (isFirstInstall === true) {
            return <Navigate to="/setup" state={{ from: location }} replace />;
        }

        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isSetupCompleted === false) {
        return <Navigate to="/setup" state={{ from: location }} replace />;
    }

    return children;
};

/**
 * SetupOnly - Allows the setup flow only while setup is incomplete.
 */
export const SetupOnly = ({ children }) => {
    const { user, loading, setupLoading, isSetupCompleted, isFirstInstall, bootstrapIssue } = useAuth();
    const location = useLocation();

    if (loading || setupLoading) {
        return <RouteLoader message="Loading system configuration..." />;
    }

    if (isSetupCompleted === null && bootstrapIssue) {
        return <RouteRecovery issue={bootstrapIssue} />;
    }

    if (isSetupCompleted === null) {
        return <RouteLoader message="Loading system configuration..." />;
    }

    if (isSetupCompleted === true) {
        return <Navigate to={user ? '/dashboard' : '/login'} replace />;
    }

    if (user || isFirstInstall === true) {
        return children;
    }

    return <Navigate to="/login" state={{ from: location }} replace />;
};
