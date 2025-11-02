/**
 * Custom hooks for sensor data fetching with caching and memoization.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { sensorsAPI, sensorHelpers } from '../services/sensorsAPI';
import { 
    DEFAULT_TIME_RANGE_VALUE, 
    DEFAULT_DATA_LIMIT, 
    DEFAULT_REFRESH_INTERVAL,
    DATA_LIMITS 
} from '../config/sensorConfig';

/**
 * Custom hook for sensor data fetching with automatic refresh and memoization.
 * 
 * @param {Object} options - Configuration options
 * @param {string} [options.sensor_box] - Filter by sensor box ID
 * @param {string} [options.sensor_type] - Filter by sensor type
 * @param {string} [options.timeRange='-24h'] - Time range for data fetching (e.g., '-24h', '-7d')
 * @param {number} [options.limit=500] - Maximum number of records to fetch
 * @param {boolean} [options.autoRefresh=true] - Enable automatic refresh
 * @param {number} [options.refreshInterval=30000] - Refresh interval in milliseconds
 * @param {boolean} [options.enabled=true] - Enable/disable data fetching
 * @returns {Object} Sensor data, loading state, error, and helper functions
 */
export const useSensorData = (options = {}) => {
    const {
        sensor_box,
        sensor_type,
        timeRange = DEFAULT_TIME_RANGE_VALUE,
        limit = DEFAULT_DATA_LIMIT,
        autoRefresh = true,
        refreshInterval = DEFAULT_REFRESH_INTERVAL,
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

    // Memoized computed values - using helper function to avoid duplication
    const groupedData = useMemo(() => {
        return sensorHelpers.groupByBox(data);
    }, [data]);

    const sensorBoxes = useMemo(() => {
        return Object.keys(groupedData);
    }, [groupedData]);

    const sensorTypes = useMemo(() => {
        return [...new Set(data.map(r => r.sensor_type))];
    }, [data]);

    // Get latest readings - one per sensor type (aggregates across all boxes)
    // Note: This groups by sensor_type only, not by box+type.
    // For latest readings per box+type combination, use sensorHelpers.getLatestReadings(data)
    const latestReadings = useMemo(() => {
        const latestByType = {};
        data.forEach(reading => {
            const sensorType = reading.sensor_type;
            if (!latestByType[sensorType] || 
                new Date(reading.timestamp) > new Date(latestByType[sensorType].timestamp)) {
                latestByType[sensorType] = reading;
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

/**
 * Hook for real-time sensor data with optimized settings.
 * @param {Object} options - Same options as useSensorData
 * @returns {Object} Same return object as useSensorData
 */
export const useRealTimeSensorData = (options = {}) => {
    return useSensorData({
        ...options,
        timeRange: '-5m',
        limit: DATA_LIMITS.realtime,
        refreshInterval: 10000, // 10 seconds for real-time
    });
};

/**
 * Hook for analytics sensor data with optimized settings for historical analysis.
 * @param {Object} options - Same options as useSensorData
 * @returns {Object} Same return object as useSensorData
 */
export const useAnalyticsSensorData = (options = {}) => {
    return useSensorData({
        ...options,
        timeRange: '-7d',
        limit: DATA_LIMITS.analytics,
        refreshInterval: 60000, // 1 minute for analytics
    });
};
