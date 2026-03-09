import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { weatherAPI } from '../services/weatherAPI';

const WeatherContext = createContext(null);

export const useWeather = () => {
    const context = useContext(WeatherContext);
    if (!context) {
        throw new Error('useWeather must be used within a WeatherProvider');
    }
    return context;
};

export const WeatherProvider = ({ children }) => {
    const [location, setLocationState] = useState({
        latitude: 52.52,
        longitude: 13.41,
        name: 'Berlin'
    });

    const [currentWeather, setCurrentWeather] = useState(null);
    const [historicalData, setHistoricalData] = useState({});
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load saved location from backend on mount
    useEffect(() => {
        const loadLocation = async () => {
            try {
                const loc = await weatherAPI.getLocation();
                if (loc && loc.latitude && loc.longitude) {
                    setLocationState(loc);
                }
            } catch (err) {
                console.warn('[Weather] Could not load saved location:', err);
            } finally {
                setLocationLoading(false);
            }
        };
        loadLocation();
    }, []);

    /**
     * Update and persist the weather location.
     * After saving, clears caches and refetches current weather.
     */
    const setLocation = useCallback(async (latitude, longitude, name) => {
        try {
            await weatherAPI.setLocation(latitude, longitude, name);
            setLocationState({ latitude, longitude, name });
            // Clear cached data so it refetches for the new location
            setCurrentWeather(null);
            setHistoricalData({});
        } catch (err) {
            console.error('[Weather] Failed to save location:', err);
            throw err;
        }
    }, []);

    /**
     * Autodetect location using browser geolocation.
     * Returns the detected coordinates, or throws if denied.
     */
    const autodetectLocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    try {
                        await weatherAPI.setLocation(lat, lon, 'Current Location');
                        setLocationState({ latitude: lat, longitude: lon, name: 'Current Location' });
                        setCurrentWeather(null);
                        setHistoricalData({});
                        resolve({ latitude: lat, longitude: lon, name: 'Current Location' });
                    } catch (err) {
                        reject(err);
                    }
                },
                (err) => {
                    reject(new Error('Location access denied'));
                }
            );
        });
    }, []);

    const fetchCurrentWeather = useCallback(async () => {
        try {
            setLoading(true);
            // Don't pass coordinates — backend reads the saved location
            const data = await weatherAPI.getCurrent();
            setCurrentWeather(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch current weather', err);
            setError('Failed to fetch weather data');
        } finally {
            setLoading(false);
        }
    }, [location]);

    // Fetch weather on mount and on location change, then every 15 min
    useEffect(() => {
        if (locationLoading) return; // Wait for location to load first
        fetchCurrentWeather();
        const interval = setInterval(fetchCurrentWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchCurrentWeather, locationLoading]);

    /**
     * Fetch historical weather for a date range.
     * Uses backend's saved location — no coordinates needed.
     */
    const getHistory = useCallback(async (startDate, endDate) => {
        const key = `${startDate}_${endDate}`;
        if (historicalData[key]) {
            return historicalData[key];
        }

        try {
            setLoading(true);
            // Don't pass coordinates — backend reads the saved location
            const data = await weatherAPI.getHistorical(null, null, startDate, endDate);

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
            console.error('Failed to fetch historical weather', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, [location, historicalData]);

    const value = {
        location,
        setLocation,
        autodetectLocation,
        currentWeather,
        getHistory,
        loading,
        locationLoading,
        error,
        refresh: fetchCurrentWeather
    };

    return (
        <WeatherContext.Provider value={value}>
            {children}
        </WeatherContext.Provider>
    );
};
