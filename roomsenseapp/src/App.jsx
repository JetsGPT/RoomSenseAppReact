import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense, useMemo } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { ConnectionsProvider, useConnections } from './contexts/ConnectionsContext';
import { SidebarProvider } from './shared/contexts/SidebarContext';
import { RequireAuth, RequireRole, PublicOnly, RequireSetup, SetupOnly } from './components/ProtectedRoute';
import Navigation from './components/ui/Navigation';
import { AppSidebar } from './shared/components/AppSidebar';
import { PageTransition } from './components/ui/PageTransition';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import AiChatbot from './components/AiChatbot';
import { Loader2 } from 'lucide-react';
import { getConnectionBoxId } from './lib/connectionIdentity';
import { lazyWithRetry } from './lib/runtimeRecovery';
import './App.css';

// Lazy load pages
const Login = lazyWithRetry(() => import('./pages/Login'), 'Login');
const AboutMe = lazyWithRetry(() => import('./pages/AboutMe'), 'AboutMe');
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard');
const Admin = lazyWithRetry(() => import('./pages/Admin'), 'Admin');
const BoxManagement = lazyWithRetry(() => import('./pages/BoxManagement'), 'BoxManagement');
const Download = lazyWithRetry(() => import('./pages/Download'), 'Download');
const Unauthorized = lazyWithRetry(() => import('./pages/Unauthorized'), 'Unauthorized');
const KioskView = lazyWithRetry(() => import('./pages/KioskView'), 'KioskView');
const FloorPlanEditor = lazyWithRetry(() => import('./pages/FloorPlanEditor'), 'FloorPlanEditor');
const Weather = lazyWithRetry(() => import('./pages/Weather'), 'Weather');
const Notifications = lazyWithRetry(() => import('./pages/Notifications'), 'Notifications');
const SystemHealth = lazyWithRetry(() => import('./pages/SystemHealth'), 'SystemHealth');
const Setup = lazyWithRetry(() => import('./pages/Setup'), 'Setup');

const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

function DashboardWrapper() {
    const { activeConnections } = useConnections();
    const sensorBoxes = useMemo(
        () => activeConnections.map(getConnectionBoxId).filter(Boolean),
        [activeConnections]
    );

    return (
        <SidebarProvider sensorBoxes={sensorBoxes} connections={activeConnections}>
            <ErrorBoundary className="m-4">
                <AppContent />
            </ErrorBoundary>
        </SidebarProvider>
    );
}

function AppContent() {
    const location = useLocation();

    const hideChrome = ['/login', '/setup', '/unauthorized', '/kiosk'];
    const shouldShowChrome = !hideChrome.includes(location.pathname);

    return (
        <>
            {shouldShowChrome && <Navigation />}
            <div className="flex" style={{ minHeight: shouldShowChrome ? 'calc(100vh - 48px)' : '100vh' }}>
                {shouldShowChrome && <AppSidebar />}
                <div className="flex-1 overflow-auto">
                    <AnimatePresence>
                        <Routes location={location} key={location.pathname}>
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

                            <Route
                                path="/about-me"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <AboutMe />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/weather"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <Weather />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/dashboard"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <Dashboard />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <RequireRole roles={['admin']}>
                                                <Suspense fallback={<LoadingFallback />}>
                                                    <PageTransition>
                                                        <Admin />
                                                    </PageTransition>
                                                </Suspense>
                                            </RequireRole>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/boxes"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <BoxManagement />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/download"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <Download />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/notifications"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <Notifications />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/system-health"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <PageTransition>
                                                    <SystemHealth />
                                                </PageTransition>
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
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
                            <Route
                                path="/kiosk"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <KioskView />
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/floor-plan"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <FloorPlanEditor />
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/floor-plan/:id"
                                element={
                                    <RequireAuth>
                                        <RequireSetup>
                                            <Suspense fallback={<LoadingFallback />}>
                                                <FloorPlanEditor />
                                            </Suspense>
                                        </RequireSetup>
                                    </RequireAuth>
                                }
                            />
                            <Route
                                path="/setup"
                                element={
                                    <SetupOnly>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <PageTransition>
                                                <Setup />
                                            </PageTransition>
                                        </Suspense>
                                    </SetupOnly>
                                }
                            />
                            <Route path="/" element={<Navigate to="/about-me" replace />} />
                            <Route path="*" element={<Navigate to="/about-me" replace />} />
                        </Routes>
                    </AnimatePresence>
                </div>
            </div>
            {shouldShowChrome && <AiChatbot />}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <SettingsProvider>
                    <AuthProvider>
                        <WeatherProvider>
                            <ConnectionsProvider>
                                <DashboardWrapper />
                            </ConnectionsProvider>
                        </WeatherProvider>
                    </AuthProvider>
                </SettingsProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
