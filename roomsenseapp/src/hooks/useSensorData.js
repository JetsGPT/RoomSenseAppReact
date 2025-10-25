import { useState, useEffect, useCallback, useMemo } from 'react';
import { sensorsAPI, sensorHelpers } from '../services/sensorsAPI';

// Custom hook for sensor data fetching with caching and memoization
export const useSensorData = (options = {}) => {
    const {
        sensor_box,
        sensor_type,
        timeRange = '-24h',
        limit = 500,
        autoRefresh = true,
        refreshInterval = 30000, // 30 seconds
        enabled = true
    } = options;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    // Memoized fetch function
    const fetchData = useCallback(async () => {
        if (!enabled) return;

        setLoading(true);
        setError(null);

        try {
            const params = {
                sensor_box,
                sensor_type,
                start_time: timeRange,
                end_time: 'now()',
                limit
            };

            const result = await sensorsAPI.getSensorData(params);
            setData(result);
            setLastFetch(new Date());
        } catch (err) {
            setError(err);
            console.error('Failed to fetch sensor data:', err);
        } finally {
            setLoading(false);
        }
    }, [sensor_box, sensor_type, timeRange, limit, enabled]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || !enabled) return;

        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchData, enabled]);

    // Memoized computed values
    const groupedData = useMemo(() => {
        return data.reduce((acc, reading) => {
            const boxId = reading.sensor_box;
            if (!acc[boxId]) {
                acc[boxId] = [];
            }
            acc[boxId].push(reading);
            return acc;
        }, {});
    }, [data]);

    const sensorBoxes = useMemo(() => {
        return Object.keys(groupedData);
    }, [groupedData]);

    const sensorTypes = useMemo(() => {
        return [...new Set(data.map(r => r.sensor_type))];
    }, [data]);

    const latestReadings = useMemo(() => {
        const latestByType = {};
        data.forEach(reading => {
            if (!latestByType[reading.sensor_type] || 
                new Date(reading.timestamp) > new Date(latestByType[reading.sensor_type].timestamp)) {
                latestByType[reading.sensor_type] = reading;
            }
        });
        return Object.values(latestByType);
    }, [data]);

    // Helper functions
    const getDataForBox = useCallback((boxId) => {
        return groupedData[boxId] || [];
    }, [groupedData]);

    const getDataForSensorType = useCallback((sensorType) => {
        return data
            .filter(reading => reading.sensor_type === sensorType)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [data]);

    const getChartDataForSensorType = useCallback((sensorType) => {
        return getDataForSensorType(sensorType).map(reading => ({
            timestamp: reading.timestamp,
            value: reading.value,
            sensor_box: reading.sensor_box
        }));
    }, [getDataForSensorType]);

    const getMultiSensorChartData = useCallback((boxId) => {
        const boxReadings = getDataForBox(boxId);
        const timePoints = [...new Set(boxReadings.map(r => r.timestamp))].sort();
        
        return timePoints.map(timestamp => {
            const readingsAtTime = boxReadings.filter(r => r.timestamp === timestamp);
            const dataPoint = { timestamp };
            
            readingsAtTime.forEach(reading => {
                dataPoint[reading.sensor_type] = reading.value;
            });
            
            return dataPoint;
        });
    }, [getDataForBox]);

    return {
        data,
        groupedData,
        sensorBoxes,
        sensorTypes,
        latestReadings,
        loading,
        error,
        lastFetch,
        fetchData,
        getDataForBox,
        getDataForSensorType,
        getChartDataForSensorType,
        getMultiSensorChartData,
        // Clear cache and refetch
        refresh: () => {
            sensorHelpers.clearCache();
            fetchData();
        }
    };
};

// Hook for real-time data
export const useRealTimeSensorData = (options = {}) => {
    return useSensorData({
        ...options,
        timeRange: '-5m',
        limit: 100,
        refreshInterval: 10000, // 10 seconds for real-time
    });
};

// Hook for analytics data
export const useAnalyticsSensorData = (options = {}) => {
    return useSensorData({
        ...options,
        timeRange: '-7d',
        limit: 1000,
        refreshInterval: 60000, // 1 minute for analytics
    });
};
