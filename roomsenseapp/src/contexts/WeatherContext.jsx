/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
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
    const { user, loading: authLoading } = useAuth();
    const [location, setLocationState] = useState(null);
    const [currentWeather, setCurrentWeather] = useState(null);
    const [historicalData, setHistoricalData] = useState({});
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(true);
    const [error, setError] = useState(null);

    const resetWeatherState = useCallback(() => {
        setLocationState(null);
        setCurrentWeather(null);
        setHistoricalData({});
        setError(null);
    }, []);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!user) {
            resetWeatherState();
            setLocationLoading(false);
            return;
        }

        let active = true;

        const loadLocation = async () => {
            setLocationLoading(true);
            try {
                const savedLocation = await weatherAPI.getLocation();
                if (active && savedLocation?.latitude != null && savedLocation?.longitude != null) {
                    setLocationState(savedLocation);
                }
            } catch (err) {
                if (active) {
                    console.warn('[Weather] Could not load saved location:', err);
                }
            } finally {
                if (active) {
                    setLocationLoading(false);
                }
            }
        };

        loadLocation();

        return () => {
            active = false;
        };
    }, [authLoading, resetWeatherState, user]);

    const setLocation = useCallback(async (latitude, longitude, name) => {
        if (!user) {
            throw new Error('You must be logged in to update the weather location');
        }

        try {
            await weatherAPI.setLocation(latitude, longitude, name);
            setLocationState({ latitude, longitude, name: name || 'Custom Location' });
            setCurrentWeather(null);
            setHistoricalData({});
            setError(null);
        } catch (err) {
            console.error('[Weather] Failed to save location:', err);
            throw err;
        }
    }, [user]);

    const autodetectLocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!user) {
                reject(new Error('You must be logged in to detect the weather location'));
                return;
            }

            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    try {
                        await weatherAPI.setLocation(latitude, longitude, 'Current Location');
                        setLocationState({ latitude, longitude, name: 'Current Location' });
                        setCurrentWeather(null);
                        setHistoricalData({});
                        setError(null);
                        resolve({ latitude, longitude, name: 'Current Location' });
                    } catch (err) {
                        reject(err);
                    }
                },
                () => {
                    reject(new Error('Location access denied'));
                }
            );
        });
    }, [user]);

    const fetchCurrentWeather = useCallback(async () => {
        if (authLoading || !user) {
            return null;
        }

        try {
            setLoading(true);
            const data = await weatherAPI.getCurrent();
            setCurrentWeather(data);
            setError(null);
            return data;
        } catch (err) {
            console.error('Failed to fetch current weather', err);
            setError('Failed to fetch weather data');
            return null;
        } finally {
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (authLoading || !user || locationLoading) {
            return;
        }

        fetchCurrentWeather();
        const interval = setInterval(fetchCurrentWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, [authLoading, fetchCurrentWeather, locationLoading, user]);

    const getHistory = useCallback(async (startDate, endDate) => {
        if (authLoading || !user) {
            return [];
        }

        const locationKey = location?.latitude != null && location?.longitude != null
            ? `${location.latitude},${location.longitude}`
            : 'default';
        const key = `${locationKey}_${startDate}_${endDate}`;

        if (historicalData[key]) {
            return historicalData[key];
        }

        try {
            setLoading(true);
            const data = await weatherAPI.getHistorical(null, null, startDate, endDate);
            const processed = [];

            if (data?.hourly?.time) {
                data.hourly.time.forEach((timestamp, index) => {
                    processed.push({
                        timestamp: new Date(timestamp).getTime(),
                        outdoor_temp: data.hourly.temperature_2m[index],
                        outdoor_humidity: data.hourly.relative_humidity_2m[index],
                    });
                });
            }

            setHistoricalData((previous) => ({ ...previous, [key]: processed }));
            return processed;
        } catch (err) {
            console.error('Failed to fetch historical weather', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, [authLoading, historicalData, location, user]);

    const value = {
        location,
        setLocation,
        autodetectLocation,
        currentWeather,
        getHistory,
        loading,
        locationLoading,
        error,
        refresh: fetchCurrentWeather,
    };

    return (
        <WeatherContext.Provider value={value}>
            {children}
        </WeatherContext.Provider>
    );
};
