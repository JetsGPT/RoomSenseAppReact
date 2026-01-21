import { useQuery, useQueries, keepPreviousData } from '@tanstack/react-query';
import { sensorsAPI, sensorHelpers } from '../services/sensorsAPI';
import { DEFAULT_TIME_RANGE_VALUE, DEFAULT_DATA_LIMIT } from '../config/sensorConfig';
import { DEV_MODE, generateMockSensorData, groupMockDataByBox } from '../config/devConfig';

// Query Keys
export const sensorKeys = {
    all: ['sensors'],
    types: () => [...sensorKeys.all, 'types'],
    boxes: () => [...sensorKeys.all, 'boxes'],
    data: (boxId, params) => [...sensorKeys.all, 'data', boxId, params],
    dashboard: (activeConnections) => [...sensorKeys.all, 'dashboard', activeConnections.map(c => c.name || c.address).sort()],
};

// Cache for mock data (regenerate periodically to simulate real updates)
let mockDataCache = null;
let mockDataTimestamp = 0;
const MOCK_DATA_TTL = 30000; // Regenerate mock data every 30 seconds

function getMockData() {
    const now = Date.now();
    if (!mockDataCache || (now - mockDataTimestamp) > MOCK_DATA_TTL) {
        console.log('[DEV MODE] Generating fresh mock sensor data');
        mockDataCache = generateMockSensorData();
        mockDataTimestamp = now;
    }
    return mockDataCache;
}

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
                const allData = getMockData();
                let boxData = allData.filter(d => d.sensor_box === boxId);

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
        const allData = getMockData();
        const latestReadings = sensorHelpers.getLatestReadings(allData);
        const groupedData = groupMockDataByBox(allData);

        // Use a simple query to manage the dev data state
        const devQuery = useQuery({
            queryKey: ['dev-dashboard-data'],
            queryFn: () => allData,
            refetchInterval: refreshInterval,
            enabled: enabled
        });

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
    const queries = activeConnections.map(conn => {
        const boxId = conn.name || conn.address;
        return {
            queryKey: sensorKeys.data(boxId, { start_time: '-5m', limit: 100, sort: 'desc', purpose: 'dashboard' }),
            queryFn: () => sensorsAPI.getSensorDataByBox(boxId, { start_time: '-5m', limit: 100, sort: 'desc' }),
            enabled: enabled,
            refetchInterval: refreshInterval,
            staleTime: 30000, // Match global staleTime to prevent refetches on view switches
            meta: { boxId }
        };
    });

    const results = useQueries({ queries });

    // Combine and process results
    const isLoading = results.some(r => r.isLoading);
    const isFetching = results.some(r => r.isFetching);

    // Flatten data and extract latest readings per type
    const resultEntries = results.map((result, index) => ({
        boxId: result.meta?.boxId || activeConnections[index]?.name || activeConnections[index]?.address,
        result
    }));

    const forbiddenEntries = resultEntries.filter(({ result }) => {
        const status = result.error?.response?.status;
        return result.isError && status === 403;
    });

    const fatalEntries = resultEntries.filter(({ result }) => {
        const status = result.error?.response?.status;
        return result.isError && status !== 403;
    });

    const forbiddenBoxes = forbiddenEntries
        .map(entry => entry.boxId)
        .filter(Boolean);

    const fatalErrors = fatalEntries.map(entry => ({
        boxId: entry.boxId,
        error: entry.result.error
    }));

    const allData = resultEntries
        .filter(({ result }) => Array.isArray(result.data))
        .flatMap(({ result }) => result.data);

    const latestReadings = sensorHelpers.getLatestReadings(allData);

    // Group by box for easier consumption
    const groupedData = sensorHelpers.groupByBox(allData);

    return {
        data: allData,
        latestReadings,
        groupedData,
        isLoading,
        isFetching,
        isError: fatalErrors.length > 0,
        error: fatalErrors.length > 0 ? fatalErrors[0].error : null,
        errors: fatalErrors.map(entry => entry.error),
        forbiddenBoxes,
        results // Return raw results if needed for individual loading states
    };
};

