import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { SidebarProvider } from './shared/contexts/SidebarContext';
import { RequireAuth, RequireRole, PublicOnly } from './components/ProtectedRoute';
import Navigation from './components/ui/Navigation';
import { AppSidebar } from './shared/components/AppSidebar';
import { PageTransition } from './components/ui/PageTransition';
import { Loader2 } from 'lucide-react';
import './App.css';
import { useSensorData } from './hooks/useSensorData';
import { DEFAULT_TIME_RANGE_VALUE, DATA_LIMITS, DEFAULT_REFRESH_INTERVAL } from './config/sensorConfig';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const AboutMe = lazy(() => import('./pages/AboutMe'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const BoxManagement = lazy(() => import('./pages/BoxManagement'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

// Loading fallback component
const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

function DashboardWrapper() {
    const { user } = useAuth();
    
    // Only fetch sensor data if user is logged in
    const { sensorBoxes } = useSensorData({
        timeRange: DEFAULT_TIME_RANGE_VALUE,
        limit: DATA_LIMITS.realtime, // Smaller limit for sidebar data
        autoRefresh: true,
        refreshInterval: DEFAULT_REFRESH_INTERVAL,
        enabled: !!user // Only fetch when user is authenticated
    });

    return (
        <SidebarProvider sensorBoxes={sensorBoxes}>
            <AppContent />
        </SidebarProvider>
    );
}

function AppContent() {
    const location = useLocation();
    
    // Define routes where Navigation should NOT be shown
    const hideNavigationRoutes = ['/login','/unauthorized'];
    const shouldShowNavigation = !hideNavigationRoutes.includes(location.pathname);
    
    // Define routes where Sidebar should be shown (dashboard-related pages)
    const showSidebarRoutes = ['/dashboard'];
    const shouldShowSidebar = showSidebarRoutes.includes(location.pathname);

    return (
        <>
            {shouldShowNavigation && <Navigation />}
            <div className="flex min-h-screen">
                {shouldShowSidebar && <AppSidebar />}
                <div className={`flex-1 ${shouldShowSidebar ? 'lg:ml-64' : ''}`}>
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            {/* Public routes - redirects to dashboard if already logged in */}
                            <Route
                                path="/login"
                                element={
                                    <PublicOnly>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <PageTransition>
                                                <Login />
                                            </PageTransition>
                                        </Suspense>
                                    </PublicOnly>
                                }
                            />

                            {/* Protected routes - requires authentication */}
                            <Route
                                path="/about-me"
                                element={
                                    <RequireAuth>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <PageTransition>
                                                <AboutMe />
                                            </PageTransition>
                                        </Suspense>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/dashboard"
                                element={
                                    <RequireAuth>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <PageTransition>
                                                <Dashboard />
                                            </PageTransition>
                                        </Suspense>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <RequireAuth>
                                        <RequireRole roles={['admin']}>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <Admin />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireRole>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/boxes"
                                element={
                                    <RequireAuth>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <PageTransition>
                                                <BoxManagement />
                                            </PageTransition>
                                        </Suspense>
                                    </RequireAuth>
                                }
                            />

                            {/* Unauthorized page */}
                            <Route 
                                path="/unauthorized" 
                                element={
                                    <Suspense fallback={<LoadingFallback />}>
                                        <PageTransition>
                                            <Unauthorized />
                                        </PageTransition>
                                    </Suspense>
                                } 
                            />

                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/about-me" replace />} />

                            {/* 404 - could create a NotFound page later */}
                            <Route path="*" element={<Navigate to="/about-me" replace />} />
                        </Routes>
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <SettingsProvider>
                    <AuthProvider>
                        <DashboardWrapper />
                    </AuthProvider>
                </SettingsProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
