import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const SettingsContext = createContext();

// Default settings
const DEFAULT_SETTINGS = {
    fetchDelay: 30,
    apiBaseUrl: 'https://localhost:8081/api',
    sensorsApiUrl: 'https://localhost:8081/api',
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    chartHeight: 300,
    defaultTimeRange: '-24h',
    defaultLimit: 500,
    showChartDots: true, // Show data points on charts (old version)
    gaugeType: 'grafana', // Default/fallback gauge display style
    staleThresholdMinutes: 2, // Minutes before marking reading as stale
    // Per-sensor gauge type preferences (empty = use recommended default)
    sensorGaugeTypes: {},
    // Display mode settings
    displayMode: 'comfort', // 'comfort' | 'tiles' | 'gauges' | 'simple'
    showTips: true,
    showRoomScore: true,
    // Custom comfort zones (null = use defaults from comfortConfig.js)
    customComfortZones: {
        temperature: { comfortMin: 19, comfortMax: 24 },
        humidity: { comfortMin: 40, comfortMax: 60 },
        light: { comfortMin: 300, comfortMax: 500 },
        pressure: { comfortMin: 1000, comfortMax: 1020 }
    }
};

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings from localStorage on mount
    useEffect(() => {
        const loadSettings = () => {
            try {
                const savedSettings = localStorage.getItem('roomsense-settings');
                if (savedSettings) {
                    const parsedSettings = JSON.parse(savedSettings);
                    setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem('roomsense-settings', JSON.stringify(settings));
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        }
    }, [settings, isLoading]);

    const updateSettings = useCallback((newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    // Get gauge type for a specific sensor (returns custom or fallback to global default)
    const getGaugeTypeForSensor = useCallback((sensorType) => {
        return settings.sensorGaugeTypes?.[sensorType] || null; // null = use recommended
    }, [settings.sensorGaugeTypes]);

    // Set gauge type for a specific sensor
    const setGaugeTypeForSensor = useCallback((sensorType, gaugeType) => {
        setSettings(prev => ({
            ...prev,
            sensorGaugeTypes: {
                ...prev.sensorGaugeTypes,
                [sensorType]: gaugeType
            }
        }));
    }, []);

    // Reset gauge type for a specific sensor (use recommended default)
    const resetGaugeTypeForSensor = useCallback((sensorType) => {
        setSettings(prev => {
            const newSensorGaugeTypes = { ...prev.sensorGaugeTypes };
            delete newSensorGaugeTypes[sensorType];
            return {
                ...prev,
                sensorGaugeTypes: newSensorGaugeTypes
            };
        });
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        settings,
        updateSettings,
        resetSettings,
        isLoading,
        // Gauge-specific helpers
        getGaugeTypeForSensor,
        setGaugeTypeForSensor,
        resetGaugeTypeForSensor
    }), [settings, updateSettings, resetSettings, isLoading, getGaugeTypeForSensor, setGaugeTypeForSensor, resetGaugeTypeForSensor]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

