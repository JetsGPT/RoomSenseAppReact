import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Thermometer, Droplets, Gauge, Sun, Wind, Eye, Zap, Clock, Home, Map, LayoutGrid } from 'lucide-react';
import { useDashboardSensorData } from '../hooks/useSensorData';
import { useSettings } from '../contexts/SettingsContext';
import { getSensorUnit, getSensorName } from '../config/sensorConfig';
import { sensorHelpers } from '../services/sensorsAPI';
import { FloorPlanKiosk } from '../components/floor-plan/FloorPlanKiosk';
import '../styles/kiosk.css';

/**
 * KioskView - Fullscreen display mode for wall-mounted tablets/monitors
 * 
 * Features:
 * - No navigation or sidebar
 * - Large-scale typography for long-distance readability
 * - Hover-only exit button
 * - Auto-adapts to landscape/portrait orientation
 * - High contrast for screen glare
 * - Shows data grouped by room/box
 */

// Sensor icon mapping
const SENSOR_ICONS = {
    temperature: Thermometer,
    humidity: Droplets,
    pressure: Gauge,
    light: Sun,
    wind_speed: Wind,
    visibility: Eye,
    voltage: Zap
};

// Get comfort color based on value
const getComfortColor = (sensorType, value) => {
    if (value === null || value === undefined) return '#6b7280';

    const ranges = {
        temperature: { low: 18, high: 26, cold: '#3b82f6', warm: '#ef4444', optimal: '#22c55e' },
        humidity: { low: 30, high: 60, cold: '#f59e0b', warm: '#3b82f6', optimal: '#22c55e' },
        pressure: { low: 1000, high: 1020, cold: '#f59e0b', warm: '#f59e0b', optimal: '#22c55e' },
        light: { low: 100, high: 1000, cold: '#6b7280', warm: '#f59e0b', optimal: '#22c55e' }
    };

    const range = ranges[sensorType];
    if (!range) return '#22c55e';

    if (value < range.low) return range.cold;
    if (value > range.high) return range.warm;
    return range.optimal;
};

// Single Sensor Reading (compact, inline)
const KioskSensorReading = ({ reading, isStale }) => {
    const Icon = SENSOR_ICONS[reading.sensor_type] || Gauge;
    const unit = getSensorUnit(reading.sensor_type);
    const color = getComfortColor(reading.sensor_type, reading.value);

    const formattedValue = reading.value !== null && reading.value !== undefined
        ? reading.value.toFixed(1)
        : '--';

    return (
        <div className="kiosk-reading">
            <Icon className="kiosk-reading-icon" style={{ color }} />
            <span className="kiosk-reading-value" style={{ color }}>
                {formattedValue}
                <span className="kiosk-reading-unit">{unit}</span>
            </span>
            {isStale && <span className="kiosk-reading-stale">•</span>}
        </div>
    );
};

// Room Row Component - shows a room with all its sensor readings
const KioskRoomRow = ({ boxId, readings, isReadingStale }) => {
    // Sort readings by sensor type for consistent ordering
    const sortedReadings = useMemo(() => {
        const order = ['temperature', 'humidity', 'pressure', 'light'];
        return [...readings].sort((a, b) => {
            const aIndex = order.indexOf(a.sensor_type);
            const bIndex = order.indexOf(b.sensor_type);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }, [readings]);

    return (
        <motion.div
            className="kiosk-room-row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Room Name */}
            <div className="kiosk-room-name">
                <Home className="kiosk-room-icon" />
                <span>{boxId}</span>
            </div>

            {/* Sensor Readings */}
            <div className="kiosk-room-readings">
                {sortedReadings.map((reading) => (
                    <KioskSensorReading
                        key={reading.sensor_type}
                        reading={reading}
                        isStale={isReadingStale(reading)}
                    />
                ))}
            </div>
        </motion.div>
    );
};

const KioskView = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const staleThreshold = (settings.staleThresholdMinutes || 2) * 60 * 1000;

    // View mode: 'rooms' or 'floorplan'
    const [viewMode, setViewMode] = useState('rooms');

    // Current time display
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch sensor data with auto-refresh
    const { data, groupedData, loading, error, refresh } = useDashboardSensorData({
        enabled: true,
        autoRefresh: true,
        refreshInterval: 10000 // Faster refresh for kiosk mode (10 seconds)
    });

    // Get latest reading per sensor type per box
    const roomsData = useMemo(() => {
        if (!groupedData || Object.keys(groupedData).length === 0) return [];

        return Object.entries(groupedData).map(([boxId, readings]) => {
            // Get latest reading for each sensor type in this box
            const latestByType = {};
            readings.forEach(reading => {
                if (!latestByType[reading.sensor_type] ||
                    new Date(reading.timestamp) > new Date(latestByType[reading.sensor_type].timestamp)) {
                    latestByType[reading.sensor_type] = reading;
                }
            });

            return {
                boxId,
                readings: Object.values(latestByType)
            };
        });
    }, [groupedData]);

    // Check if a reading is stale
    const isReadingStale = useCallback((reading) => {
        if (!reading?.timestamp) return true;
        const readingTime = new Date(reading.timestamp).getTime();
        return Date.now() - readingTime > staleThreshold;
    }, [staleThreshold]);

    // Handle exit
    const handleExit = useCallback(() => {
        navigate('/dashboard');
    }, [navigate]);

    // Format time
    const formattedTime = currentTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const formattedDate = currentTime.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    // Loading state
    if (loading && roomsData.length === 0) {
        return (
            <div className="kiosk-view">
                <div className="kiosk-loading">
                    <div className="kiosk-loading-spinner" />
                    <span className="kiosk-loading-text">Loading sensors...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error && roomsData.length === 0) {
        return (
            <div className="kiosk-view">
                <div className="kiosk-exit-container" style={{ opacity: 1, pointerEvents: 'auto' }}>
                    <button className="kiosk-exit-button" onClick={handleExit}>
                        <X size={18} />
                        Exit Kiosk
                    </button>
                </div>
                <div className="kiosk-error">
                    <span className="kiosk-error-icon">⚠️</span>
                    <p className="kiosk-error-message">
                        {error?.message || 'Failed to load sensor data'}
                    </p>
                    <button className="kiosk-retry-button" onClick={refresh}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="kiosk-view">
            {/* Exit Button - Only visible on hover */}
            <div className="kiosk-exit-container">
                <button className="kiosk-exit-button" onClick={handleExit}>
                    <X size={18} />
                    Exit Kiosk
                </button>
            </div>

            {/* View Mode Toggle */}
            <div className="kiosk-view-toggle">
                <button
                    className={`kiosk-view-toggle-btn ${viewMode === 'rooms' ? 'active' : ''}`}
                    onClick={() => setViewMode('rooms')}
                    title="Rooms View"
                >
                    <LayoutGrid size={20} />
                    <span>Rooms</span>
                </button>
                <button
                    className={`kiosk-view-toggle-btn ${viewMode === 'floorplan' ? 'active' : ''}`}
                    onClick={() => setViewMode('floorplan')}
                    title="Floor Plan View"
                >
                    <Map size={20} />
                    <span>Floor Plan</span>
                </button>
            </div>

            {viewMode === 'floorplan' ? (
                <FloorPlanKiosk autoRotateFloors={true} rotationInterval={15000} />
            ) : (
                <div className="kiosk-content">
                    {/* Header */}
                    <header className="kiosk-header">
                        <div>
                            <h1 className="kiosk-title">RoomSense</h1>
                            <p style={{ opacity: 0.6, fontSize: '1rem' }}>{formattedDate}</p>
                        </div>
                        <div className="kiosk-time">
                            <Clock size={24} style={{ opacity: 0.6, marginRight: '0.5rem' }} />
                            {formattedTime}
                        </div>
                    </header>

                    {/* Room Rows */}
                    <div className="kiosk-rooms-container">
                        <AnimatePresence>
                            {roomsData.map((room, index) => (
                                <motion.div
                                    key={room.boxId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <KioskRoomRow
                                        boxId={room.boxId}
                                        readings={room.readings}
                                        isReadingStale={isReadingStale}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskView;
