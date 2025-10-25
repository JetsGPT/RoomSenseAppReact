import React, { createContext, useContext, useState, useEffect } from 'react';

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
    defaultLimit: 500
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

    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    const value = {
        settings,
        updateSettings,
        resetSettings,
        isLoading
    };

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
