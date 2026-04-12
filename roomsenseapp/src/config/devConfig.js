/**
 * Development Configuration
 * 
 * Enable dev mode features like login bypass and mock data.
 * Set DEV_MODE to false for production.
 */

// Enable development mode (bypasses login, uses mock data)
// Enable development mode (bypasses login, uses mock data)
export const DEV_MODE = true;

// Mock user for development
export const DEV_USER = {
    id: 1,
    username: 'dev_user',
    role: 'admin',
    email: 'dev@roomsense.local'
};

// Mock active connections/boxes for development
export const DEV_CONNECTIONS = [
    { address: 'AA:BB:CC:DD:EE:01', name: 'Living Room', connected: true },
    { address: 'AA:BB:CC:DD:EE:02', name: 'Bedroom', connected: true },
    { address: 'AA:BB:CC:DD:EE:03', name: 'Kitchen', connected: true }
];

// Mock Wi-Fi Networks
export const DEV_WIFI_NETWORKS = {
    networks: [
        { ssid: 'Dev_Network_5GHz', signal: 95, security: 'WPA3', requiresPassword: true, isSaved: true, isCurrent: true },
        { ssid: 'Dev_Network_2.4GHz', signal: 82, security: 'WPA2', requiresPassword: true, isSaved: false },
        { ssid: 'Guest_WiFi', signal: 60, security: '', requiresPassword: false, isSaved: false },
    ],
    wifiSupported: true,
    current: { connected: true, ssid: 'Dev_Network_5GHz', interface: 'wlan0' }
};

// Mock Scanned Devices
export const DEV_SCANNED_DEVICES = [
    { address: 'FF:EE:DD:CC:BB:01', name: 'RoomSense Demo Box' },
    { address: 'FF:EE:DD:CC:BB:02', name: 'New Sensor Hub' }
];

// Mock Pairing Mode (Triggers PIN requirement when connecting to scanned devices in dev mode)
export const DEV_MOCK_PAIRING_MODE = true;

const MOCK_SENSOR_DATA_TTL_MS = 30000;
let mockSensorDataCache = null;
let mockSensorDataTimestamp = 0;

export function resolveMockSensorBoxId(boxId) {
    const normalizedBoxId = String(boxId || '').trim().toLowerCase();

    if (!normalizedBoxId) {
        return '';
    }

    const matchingConnection = DEV_CONNECTIONS.find((connection) =>
        [connection.name, connection.original_name, connection.box_name, connection.address]
            .filter(Boolean)
            .some((value) => String(value).trim().toLowerCase() === normalizedBoxId)
    );

    return matchingConnection?.name || String(boxId);
}


/**
 * Generate mock sensor data for development
 * Creates realistic sensor readings for the past 24 hours
 */
export function generateMockSensorData() {
    const now = Date.now();
    const readings = [];
    const boxes = DEV_CONNECTIONS.map(c => c.name);
    const sensorTypes = ['temperature', 'humidity', 'pressure', 'light'];

    // Generate data points for the last 24 hours (every 5 minutes)
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const hoursOfData = 24;
    const pointsPerSensor = (hoursOfData * 60) / 5; // 288 points per sensor

    boxes.forEach(boxName => {
        sensorTypes.forEach(sensorType => {
            // Base values and variation for each sensor type
            const config = getSensorBaseConfig(sensorType);

            for (let i = 0; i < pointsPerSensor; i++) {
                const timestamp = new Date(now - (pointsPerSensor - i) * intervalMs);

                // Add some realistic variation (sine wave + random noise)
                const hourOfDay = timestamp.getHours();
                const dailyVariation = Math.sin((hourOfDay - 6) * Math.PI / 12); // Peak at noon
                const randomNoise = (Math.random() - 0.5) * config.noise;

                let value = config.base + (dailyVariation * config.dailySwing) + randomNoise;

                // Clamp to realistic range
                value = Math.max(config.min, Math.min(config.max, value));

                readings.push({
                    id: `${boxName}-${sensorType}-${i}`,
                    sensor_box: boxName,
                    sensor_type: sensorType,
                    value: parseFloat(value.toFixed(2)),
                    timestamp: timestamp.toISOString()
                });
            }
        });
    });

    return readings;
}

export function getMockSensorData({ forceRefresh = false } = {}) {
    const now = Date.now();

    if (forceRefresh || !mockSensorDataCache || (now - mockSensorDataTimestamp) > MOCK_SENSOR_DATA_TTL_MS) {
        mockSensorDataCache = generateMockSensorData();
        mockSensorDataTimestamp = now;
    }

    return mockSensorDataCache;
}

/**
 * Get the latest reading for each sensor in development mode
 */
export function getLatestMockReadings() {
    const latestBySeries = new Map();

    getMockSensorData().forEach((reading) => {
        const key = `${reading.sensor_box}-${reading.sensor_type}`;
        const current = latestBySeries.get(key);

        if (!current || new Date(reading.timestamp) > new Date(current.timestamp)) {
            latestBySeries.set(key, reading);
        }
    });

    return Array.from(latestBySeries.values());
}

/**
 * Get base configuration for sensor type (for mock data generation)
 */
function getSensorBaseConfig(sensorType) {
    switch (sensorType) {
        case 'temperature':
            return { base: 22, dailySwing: 5, noise: 2, min: 15, max: 35 };
        case 'humidity':
            return { base: 50, dailySwing: 15, noise: 8, min: 30, max: 80 };
        case 'pressure':
            return { base: 1013, dailySwing: 5, noise: 3, min: 990, max: 1030 };
        case 'light':
            return { base: 500, dailySwing: 800, noise: 200, min: 0, max: 2000 };
        default:
            return { base: 50, dailySwing: 10, noise: 5, min: 0, max: 100 };
    }
}

/**
 * Group sensor data by box
 */
export function groupMockDataByBox(data) {
    return data.reduce((acc, reading) => {
        const boxId = reading.sensor_box;
        if (!acc[boxId]) {
            acc[boxId] = [];
        }
        acc[boxId].push(reading);
        return acc;
    }, {});
}

// Mock System Health
export const DEV_SYSTEM_HEALTH = DEV_CONNECTIONS.map(conn => ({
    ...conn,
    status: 'online',
    last_seen: new Date().toISOString(),
    sensors: ['temperature', 'humidity', 'pressure', 'light'].map(type => ({
        type,
        status: 'online',
        last_seen: new Date().toISOString()
    }))
}));
