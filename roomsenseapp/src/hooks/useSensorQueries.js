import { useQuery, useQueries, keepPreviousData } from '@tanstack/react-query';
import { sensorsAPI, sensorHelpers } from '../services/sensorsAPI';
import { DEFAULT_TIME_RANGE_VALUE, DEFAULT_DATA_LIMIT } from '../config/sensorConfig';

// Query Keys
export const sensorKeys = {
    all: ['sensors'],
    types: () => [...sensorKeys.all, 'types'],
    boxes: () => [...sensorKeys.all, 'boxes'],
    data: (boxId, params) => [...sensorKeys.all, 'data', boxId, params],
    dashboard: (activeConnections) => [...sensorKeys.all, 'dashboard', activeConnections.map(c => c.name || c.address).sort()],
};

/**
 * Hook to fetch available sensor types
 */
export const useSensorTypes = () => {
    return useQuery({
        queryKey: sensorKeys.types(),
        queryFn: sensorsAPI.getSensorTypes,
        staleTime: 1000 * 60 * 60, // Types rarely change, cache for 1 hour
    });
};

/**
 * Hook to fetch sensor data for a specific box
 * @param {string} boxId - The ID of the sensor box
 * @param {Object} params - Query parameters (timeRange, limit, etc.)
 * @param {Object} options - React Query options
 */
export const useSensorDataQuery = (boxId, params = {}, options = {}) => {
    const {
        sensor_type,
        timeRange = DEFAULT_TIME_RANGE_VALUE,
        startTime,
        endTime,
        limit = DEFAULT_DATA_LIMIT,
        enabled = true,
        refreshInterval = false,
        sort = 'desc'
    } = params;

    const queryParams = {
        sensor_type,
        start_time: startTime || timeRange,
        end_time: endTime || 'now()',
        limit,
        sort
    };

    return useQuery({
        queryKey: sensorKeys.data(boxId, queryParams),
        queryFn: () => sensorsAPI.getSensorDataByBox(boxId, queryParams),
        enabled: !!boxId && enabled,
        placeholderData: keepPreviousData, // Keep showing previous data while fetching new data
        refetchInterval: refreshInterval,
        ...options
    });
};

/**
 * Hook to fetch dashboard data for all active connections in parallel
 * @param {Array} activeConnections - List of active connections
 * @param {Object} options - React Query options
 */
export const useDashboardData = (activeConnections = [], options = {}) => {
    // Remove default value for refreshInterval to respect user settings
    const { refreshInterval, enabled = true } = options;

    // Create a query for each active connection
    const queries = activeConnections.map(conn => {
        const boxId = conn.name || conn.address;
        return {
            queryKey: sensorKeys.data(boxId, { limit: 100, sort: 'desc', purpose: 'dashboard' }),
            queryFn: () => sensorsAPI.getSensorDataByBox(boxId, { limit: 100, sort: 'desc' }),
            enabled: enabled,
            refetchInterval: refreshInterval,
            staleTime: 30000, // Match global staleTime to prevent refetches on view switches
        };
    });

    const results = useQueries({ queries });

    // Combine and process results
    const isLoading = results.some(r => r.isLoading);
    const isFetching = results.some(r => r.isFetching);
    const isError = results.some(r => r.isError);
    const errors = results.filter(r => r.isError).map(r => r.error);

    // Flatten data and extract latest readings per type
    const allData = results
        .flatMap(r => r.data || [])
        .filter(Boolean);

    const latestReadings = sensorHelpers.getLatestReadings(allData);

    // Group by box for easier consumption
    const groupedData = sensorHelpers.groupByBox(allData);

    return {
        data: allData,
        latestReadings,
        groupedData,
        isLoading,
        isFetching,
        isError,
        errors,
        results // Return raw results if needed for individual loading states
    };
};
