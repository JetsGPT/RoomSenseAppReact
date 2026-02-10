import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { ConnectionsProvider } from './contexts/ConnectionsContext';
import { DashboardWrapper } from './components/DashboardWrapper';
import { RequireAuth as ProtectedRoute } from './components/ProtectedRoute'; // Importing RequireAuth as ProtectedRoute
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FloorPlanEditor from './pages/FloorPlanEditor';
import BoxManagement from './pages/BoxManagement';
import KioskView from './pages/KioskView';
import Download from './pages/Download';
import AboutMe from './pages/AboutMe';
import Admin from './pages/Admin';
import Weather from './pages/Weather';
import CorrelationAnalysis from './pages/CorrelationAnalysis';
import Unauthorized from './pages/Unauthorized';

// ... (existing imports)

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <SettingsProvider>
                    <WeatherProvider>
                        <AuthProvider>
                            <ConnectionsProvider>
                                <Routes>
                                    <Route path="/login" element={<Login />} />

                                    {/* Protected Routes wrapped in Dashboard Layout */}
                                    <Route element={
                                        <ProtectedRoute>
                                            <DashboardWrapper />
                                        </ProtectedRoute>
                                    }>
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="/dashboard/*" element={<Dashboard />} />
                                        <Route path="/floor-plan" element={<FloorPlanEditor />} />
                                        <Route path="/boxes" element={<BoxManagement />} />
                                        <Route path="/kiosk" element={<KioskView />} />
                                        <Route path="/download" element={<Download />} />
                                        <Route path="/about-me" element={<AboutMe />} />
                                        <Route path="/weather" element={<Weather />} />
                                        <Route path="/correlation" element={<CorrelationAnalysis />} />
                                        <Route path="/admin" element={<Admin />} />
                                        <Route path="/unauthorized" element={<Unauthorized />} />
                                    </Route>

                                    {/* Fallback */}
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </ConnectionsProvider>
                        </AuthProvider>
                    </WeatherProvider>
                </SettingsProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
