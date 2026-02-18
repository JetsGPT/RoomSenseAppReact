import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { weatherAPI } from '../services/weatherAPI';
import { useSettings } from './SettingsContext';

const WeatherContext = createContext(null);

export const useWeather = () => {
    const context = useContext(WeatherContext);
    if (!context) {
        throw new Error('useWeather must be used within a WeatherProvider');
    }
    return context;
};

export const WeatherProvider = ({ children }) => {
    // Default location (Berlin) - could be moved to config
    const DEFAULT_LAT = 52.52;
    const DEFAULT_LON = 13.41;

    const { settings } = useSettings();
    const [location, setLocation] = useState({
        latitude: settings?.location?.latitude || DEFAULT_LAT,
        longitude: settings?.location?.longitude || DEFAULT_LON,
        name: settings?.location?.name || 'Berlin'
    });

    const [currentWeather, setCurrentWeather] = useState(null);
    const [historicalData, setHistoricalData] = useState({}); // Cache by date range key
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Verify user location on mount
    useEffect(() => {
        // If user has a custom location setting, use that
        if (settings?.location?.latitude && settings?.location?.longitude) {
            setLocation({
                latitude: settings.location.latitude,
                longitude: settings.location.longitude,
                name: settings.location.name || 'Custom Location'
            });
            return;
        }

        // Otherwise try to get actual position
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        name: 'Current Location'
                    });
                },
                (error) => {
                    console.warn("Geolocation access denied or failed", error);
                    // Fallback is already set in initial state (Berlin)
                }
            );
        }
    }, [settings]);

    const fetchCurrentWeather = useCallback(async () => {
        try {
            setLoading(true);
            const data = await weatherAPI.getCurrent(location.latitude, location.longitude);
            setCurrentWeather(data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch current weather", err);
            setError("Failed to fetch weather data");
        } finally {
            setLoading(false);
        }
    }, [location]);

    // Fetch on mount and interval
    useEffect(() => {
        fetchCurrentWeather();
        const interval = setInterval(fetchCurrentWeather, 15 * 60 * 1000); // 15 mins
        return () => clearInterval(interval);
    }, [fetchCurrentWeather]);

    /**
     * Fetch historical weather for a specific range
     * @param {string} startDate YYYY-MM-DD
     * @param {string} endDate YYYY-MM-DD
     */
    const getHistory = useCallback(async (startDate, endDate) => {
        const key = `${startDate}_${endDate}`;
        if (historicalData[key]) {
            return historicalData[key];
        }

        try {
            setLoading(true);
            const data = await weatherAPI.getHistorical(
                location.latitude,
                location.longitude,
                startDate,
                endDate
            );

            // Process data into chart-friendly format
            // OpenMeteo returns { hourly: { time: [], temperature_2m: [] } }
            // We want array of { timestamp, outdoor_temp, outdoor_humidity }
            const processed = [];
            if (data?.hourly?.time) {
                data.hourly.time.forEach((t, i) => {
                    processed.push({
                        timestamp: new Date(t).getTime(),
                        outdoor_temp: data.hourly.temperature_2m[i],
                        outdoor_humidity: data.hourly.relative_humidity_2m[i]
                    });
                });
            }

            setHistoricalData(prev => ({ ...prev, [key]: processed }));
            return processed;
        } catch (err) {
            console.error("Failed to fetch historical weather", err);
            return [];
        } finally {
            setLoading(false);
        }
    }, [location, historicalData]);

    const value = {
        location,
        currentWeather,
        getHistory,
        loading,
        error,
        refresh: fetchCurrentWeather
    };

    return (
        <WeatherContext.Provider value={value}>
            {children}
        </WeatherContext.Provider>
    );
};
