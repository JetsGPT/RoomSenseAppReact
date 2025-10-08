import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth, RequireRole, PublicOnly } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
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
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* 404 - could create a NotFound page later */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
