import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { SidebarProvider } from './shared/contexts/SidebarContext';
import { RequireAuth, RequireRole, PublicOnly } from './components/ProtectedRoute';
import Navigation from './components/ui/Navigation';
import { AppSidebar } from './shared/components/AppSidebar';
import { PageTransition } from './components/ui/PageTransition';
import Login from './pages/Login';
import AboutMe from './pages/AboutMe';
import Unauthorized from './pages/Unauthorized';
import Admin from './pages/Admin';
import './App.css';
import Dashboard from './pages/Dashboard';
import { useSensorData } from './hooks/useSensorData';

function DashboardWrapper() {
    const location = useLocation();
    const isDashboardRoute = location.pathname.startsWith('/dashboard');

    // Fetch sensor data for the sidebar only when the dashboard is active
    const { sensorBoxes } = useSensorData({
        timeRange: '-24h',
        limit: 100, // Smaller limit for sidebar data
        autoRefresh: isDashboardRoute,
        refreshInterval: 30000, // 30 seconds
        enabled: isDashboardRoute
    });

    const effectiveSensorBoxes = isDashboardRoute ? sensorBoxes : [];

    return (
        <SidebarProvider sensorBoxes={effectiveSensorBoxes}>
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
                                        <PageTransition>
                                            <Login />
                                        </PageTransition>
                                    </PublicOnly>
                                }
                            />

                            {/* Protected routes - requires authentication */}
                            <Route
                                path="/about-me"
                                element={
                                    <RequireAuth>
                                        <PageTransition>
                                            <AboutMe />
                                        </PageTransition>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/dashboard"
                                element={
                                    <RequireAuth>
                                        <PageTransition>
                                            <Dashboard />
                                        </PageTransition>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <RequireAuth>
                                        <RequireRole roles={['admin']}>
                                            <PageTransition>
                                                <Admin />
                                            </PageTransition>
                                        </RequireRole>
                                    </RequireAuth>
                                }
                            />

                            {/* Example: Admin-only route */}
                            {/* Uncomment when you have an admin page */}
                            {/*
                            <Route
                                path="/admin"
                                element={
                                    <RequireRole roles={['admin']}>
                                        <AdminPanel />
                                    </RequireRole>
                                }
                            />
                            */}

                            {/* Example: Multi-role route */}
                            {/*
                            <Route
                                path="/sensors"
                                element={
                                    <RequireRole roles={['admin', 'user']}>
                                        <SensorsPage />
                                    </RequireRole>
                                }
                            />
                            */}

                            {/* Unauthorized page */}
                            <Route 
                                path="/unauthorized" 
                                element={
                                    <PageTransition>
                                        <Unauthorized />
                                    </PageTransition>
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
