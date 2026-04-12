import { useQuery, useQueries, keepPreviousData } from '@tanstack/react-query';
import { sensorsAPI, sensorHelpers } from '../services/sensorsAPI';
import { DEFAULT_TIME_RANGE_VALUE, DEFAULT_DATA_LIMIT } from '../config/sensorConfig';
import { DEV_MODE, getMockSensorData, groupMockDataByBox, resolveMockSensorBoxId } from '../config/devConfig';
import { getConnectionBoxId } from '../lib/connectionIdentity';

// Query Keys
export const sensorKeys = {
    all: ['sensors'],
    types: () => [...sensorKeys.all, 'types'],
    boxes: () => [...sensorKeys.all, 'boxes'],
    data: (boxId, params) => [...sensorKeys.all, 'data', boxId, params],
    dashboard: (activeConnections) => [...sensorKeys.all, 'dashboard', activeConnections.map(getConnectionBoxId).filter(Boolean).sort()],
};

/**
 * Hook to fetch available sensor types
 */
export const useSensorTypes = () => {
    return useQuery({
        queryKey: sensorKeys.types(),
        queryFn: () => {
            // DEV MODE: Return mock sensor types
            if (DEV_MODE) {
                return ['temperature', 'humidity', 'pressure', 'light'];
            }
            return sensorsAPI.getSensorTypes();
        },
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
        queryFn: () => {
            // DEV MODE: Return filtered mock data for specific box
            if (DEV_MODE) {
                const resolvedBoxId = resolveMockSensorBoxId(boxId);
                const allData = getMockSensorData();
                let boxData = allData.filter(d => d.sensor_box === resolvedBoxId);

                // Apply sensor_type filter if specified
                if (sensor_type) {
                    boxData = boxData.filter(d => d.sensor_type === sensor_type);
                }

                // Sort and limit
                boxData.sort((a, b) => {
                    const diff = new Date(b.timestamp) - new Date(a.timestamp);
                    return sort === 'desc' ? diff : -diff;
                });

                return boxData.slice(0, limit);
            }
            return sensorsAPI.getSensorDataByBox(boxId, queryParams);
        },
        enabled: !!boxId && enabled,
        placeholderData: keepPreviousData, // Keep showing previous data while fetching new data
        refetchInterval: refreshInterval,
        staleTime: 10000, // 10 seconds stale time default
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

    // DEV MODE: Return all mock data
    if (DEV_MODE) {
        const fallbackData = getMockSensorData();
        const devQuery = useQuery({
            queryKey: ['dev-dashboard-data'],
            queryFn: () => getMockSensorData({ forceRefresh: true }),
            refetchInterval: refreshInterval,
            enabled: enabled
        });

        const allData = Array.isArray(devQuery.data) ? devQuery.data : fallbackData;
        const latestReadings = sensorHelpers.getLatestReadings(allData);
        const groupedData = groupMockDataByBox(allData);

        return {
            data: allData,
            latestReadings,
            groupedData,
            isLoading: false,
            isFetching: devQuery.isFetching,
            isError: false,
            errors: [],
            results: [devQuery]
        };
    }

    // Create a query for each active connection
    const queries = activeConnections
        .map((conn) => {
            const boxId = getConnectionBoxId(conn);
            if (!boxId) {
                return null;
            }

            return {
                queryKey: sensorKeys.data(boxId, { start_time: '-5m', limit: 100, sort: 'desc', purpose: 'dashboard' }),
                queryFn: () => sensorsAPI.getSensorDataByBox(boxId, { start_time: '-5m', limit: 100, sort: 'desc' }),
                enabled: enabled,
                refetchInterval: refreshInterval,
                staleTime: 30000, // Match global staleTime to prevent refetches on view switches
            };
        })
        .filter(Boolean);

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

