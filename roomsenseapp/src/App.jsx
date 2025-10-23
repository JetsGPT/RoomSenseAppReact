import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RequireAuth, RequireRole, PublicOnly } from './components/ProtectedRoute';
import Navigation from './components/ui/Navigation';
import Login from './pages/Login';
import AboutMe from './pages/AboutMe';
import Unauthorized from './pages/Unauthorized';
import './App.css';
import Dashboard from './pages/Dashboard';

function AppContent() {
    const location = useLocation();
    
    // Define routes where Navigation should NOT be shown
    const hideNavigationRoutes = ['/login','/unauthorized'];
    const shouldShowNavigation = !hideNavigationRoutes.includes(location.pathname);

    return (
        <>
            {shouldShowNavigation && <Navigation />}
            <Routes>
                    {/* Public routes - redirects to dashboard if already logged in */}
                    <Route
                        path="/login"
                        element={
                            <PublicOnly>
                                <Login />
                            </PublicOnly>
                        }
                    />

                    {/* Protected routes - requires authentication */}
                    <Route
                        path="/about-me"
                        element={
                            <RequireAuth>
                                <AboutMe />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <RequireAuth>
                                <Dashboard />
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
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/about-me" replace />} />

                    {/* 404 - could create a NotFound page later */}
                    <Route path="*" element={<Navigate to="/about-me" replace />} />
                </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
