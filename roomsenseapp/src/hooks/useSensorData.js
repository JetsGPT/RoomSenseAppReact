/**
 * Custom hooks for sensor data fetching - Compatibility Layer
 * 
 * This file now wraps the new React Query hooks to maintain backward compatibility
 * with existing components while leveraging the new architecture.
 */

import { useSensorDataQuery, useDashboardData, useSensorTypes } from './useSensorQueries';
import { sensorHelpers } from '../services/sensorsAPI';
import { useConnections } from '../contexts/ConnectionsContext';
import { useMemo } from 'react';
import { DATA_LIMITS } from '../config/sensorConfig';

/**
 * Legacy hook wrapper for sensor data fetching.
 * Delegates to useSensorDataQuery or useDashboardData based on arguments.
 */
export const useSensorData = (options = {}) => {
    const {
        sensor_box,
        sensor_type,
        timeRange,
        startTime,
        endTime,
        limit,
        autoRefresh = true,
        refreshInterval = 30000,
        enabled = true,
        sort = 'desc'
    } = options;

    const { activeConnections } = useConnections();

    // Case 1: Specific box requested
    const singleBoxQuery = useSensorDataQuery(
        sensor_box,
        { sensor_type, timeRange, startTime, endTime, limit, sort },
        {
            enabled: !!sensor_box && enabled,
            refetchInterval: autoRefresh ? refreshInterval : false
        }
    );

    // Case 2: Dashboard mode (all active connections)
    const dashboardQuery = useDashboardData(
        activeConnections,
        {
            enabled: !sensor_box && enabled,
            refreshInterval: autoRefresh ? refreshInterval : false
        }
    );

    // Determine which result to return
    const activeResult = sensor_box ? singleBoxQuery : dashboardQuery;

    const data = activeResult.data || [];
    const loading = activeResult.isLoading;
    const error = activeResult.error;
    const lastFetch = activeResult.dataUpdatedAt ? new Date(activeResult.dataUpdatedAt) : null;

    // Memoized computed values (same as before)
    const groupedData = useMemo(() => {
        return sensorHelpers.groupByBox(data);
    }, [data]);

    const sensorBoxes = useMemo(() => {
        return Object.keys(groupedData);
    }, [groupedData]);

    const sensorTypes = useMemo(() => {
        return [...new Set(data.map(r => r.sensor_type))];
    }, [data]);

    const latestReadings = useMemo(() => {
        return sensorHelpers.getLatestReadings(data);
    }, [data]);

    // Helper functions (same as before)
    const getDataForBox = (boxId) => groupedData[boxId] || [];

    const getDataForSensorType = (sensorType) =>
        data.filter(reading => reading.sensor_type === sensorType)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const getChartDataForSensorType = (sensorType) =>
        getDataForSensorType(sensorType).map(reading => ({
            timestamp: reading.timestamp,
            value: reading.value,
            sensor_box: reading.sensor_box
        }));

    const getMultiSensorChartData = (boxId) => {
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
    };

    return {
        data,
        groupedData,
        sensorBoxes,
        sensorTypes,
        latestReadings,
        loading,
        error,
        lastFetch,
        fetchData: activeResult.refetch, // Map refetch to fetchData
        getDataForBox,
        getDataForSensorType,
        getChartDataForSensorType,
        getMultiSensorChartData,
        refresh: activeResult.refetch,
        isFetching: activeResult.isFetching
    };
};

/**
 * Hook for real-time sensor data with optimized settings.
 */
export const useRealTimeSensorData = (options = {}) => {
    return useSensorData({
        ...options,
        timeRange: '-5m',
        limit: DATA_LIMITS.realtime,
        refreshInterval: 10000,
    });
};

/**
 * Hook for analytics sensor data with optimized settings.
 */
export const useAnalyticsSensorData = (options = {}) => {
    return useSensorData({
        ...options,
        timeRange: '-7d',
        limit: DATA_LIMITS.analytics,
        refreshInterval: 60000,
    });
};

/**
 * Optimized hook for Dashboard Overview.
 */
export const useDashboardSensorData = (options = {}) => {
    const { activeConnections } = useConnections();
    const {
        data,
        groupedData,
        isLoading,
        isFetching,
        error,
        results
    } = useDashboardData(activeConnections, options);

    const sensorTypesQuery = useSensorTypes();

    return {
        data,
        groupedData,
        sensorTypes: sensorTypesQuery.data || [],
        loading: isLoading,
        isFetching,
        error,
        refresh: () => results.forEach(r => r.refetch())
    };
};
