import { DEV_CONNECTIONS, getMockSensorData } from '../config/devConfig';
import { calculateDewPoint } from '../lib/correlationUtils';

const SENSOR_UNITS = {
    temperature: 'C',
    humidity: '%',
    pressure: 'hPa',
    light: 'lux',
};

const SENSOR_SAMPLE_POINTS = 8;
const WEATHER_SAMPLE_POINTS = 12;
const DEFAULT_WEATHER_WINDOW_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function round(value, digits = 1) {
    if (!Number.isFinite(value)) {
        return null;
    }

    return Number(value.toFixed(digits));
}

function normalizeTimestamp(value, fallback = Date.now()) {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const relativeMatch = value.trim().match(/^-(\d+)([mhd])$/i);
        if (relativeMatch) {
            const [, rawAmount, rawUnit] = relativeMatch;
            const amount = Number(rawAmount);
            const multipliers = {
                m: 60 * 1000,
                h: 60 * 60 * 1000,
                d: 24 * 60 * 60 * 1000,
            };

            return fallback - (amount * multipliers[rawUnit.toLowerCase()]);
        }
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : fallback;
}

function downsamplePoints(points, maxPoints) {
    if (!Array.isArray(points) || points.length <= maxPoints) {
        return points;
    }

    const lastIndex = points.length - 1;
    const sampled = [];

    for (let index = 0; index < maxPoints; index += 1) {
        const pointIndex = Math.round((index * lastIndex) / (maxPoints - 1));
        sampled.push(points[pointIndex]);
    }

    return sampled;
}

function summarizeSeries(points, maxSamplePoints) {
    const normalizedPoints = (points || [])
        .map((point) => ({
            timestamp: new Date(point.timestamp).toISOString(),
            value: Number(point.value),
        }))
        .filter((point) => Number.isFinite(new Date(point.timestamp).getTime()) && Number.isFinite(point.value))
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

    if (!normalizedPoints.length) {
        return null;
    }

    const values = normalizedPoints.map((point) => point.value);
    const firstPoint = normalizedPoints[0];
    const lastPoint = normalizedPoints[normalizedPoints.length - 1];

    return {
        count: normalizedPoints.length,
        min: round(Math.min(...values), 2),
        max: round(Math.max(...values), 2),
        avg: round(values.reduce((sum, value) => sum + value, 0) / values.length, 2),
        start: firstPoint,
        end: lastPoint,
        latest: lastPoint,
        delta: round(lastPoint.value - firstPoint.value, 2),
        sample: downsamplePoints(normalizedPoints, maxSamplePoints),
    };
}

function buildMockWeatherPoint(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours() + (date.getMinutes() / 60);
    const dailyPhase = ((hours - 6) * Math.PI) / 12;
    const monthlyPhase = ((date.getMonth() + 1) / 12) * Math.PI * 2;
    const dayPhase = (date.getDate() / 31) * Math.PI * 2;

    const outdoorTemp = 11
        + (Math.sin(dailyPhase) * 7)
        + (Math.cos(dayPhase) * 2)
        + (Math.sin(monthlyPhase) * 1.5);
    const outdoorHumidity = 66
        - (Math.sin(dailyPhase) * 14)
        + (Math.cos(monthlyPhase) * 3);
    const windSpeed = 8
        + (Math.cos(dailyPhase) * 3)
        + (Math.sin(dayPhase) * 1.5);
    const precipitation = clamp((Math.cos(dayPhase) - 0.25) * 0.9, 0, 1.4);

    return {
        timestamp: new Date(timestamp).toISOString(),
        outdoor_temp: round(outdoorTemp, 1),
        outdoor_humidity: round(clamp(outdoorHumidity, 35, 90), 0),
        wind_speed: round(clamp(windSpeed, 1, 20), 1),
        precipitation: round(precipitation, 1),
    };
}

function buildMoldRisk(latestTemperature, latestHumidity) {
    const dewPoint = calculateDewPoint(latestTemperature, latestHumidity);

    if (!Number.isFinite(latestTemperature) || !Number.isFinite(latestHumidity)) {
        return {
            status: 'green',
            riskScore: 10,
            explanation: 'Not enough mock temperature and humidity data is available yet.',
            dangerDurationHours: 0,
            warningDurationHours: 0,
            dewPoint: null,
        };
    }

    if (latestHumidity >= 72 || (dewPoint ?? -Infinity) >= 18) {
        return {
            status: 'red',
            riskScore: 84,
            explanation: `Humidity is elevated at ${round(latestHumidity, 0)}% with a dew point near ${round(dewPoint, 1)} C.`,
            dangerDurationHours: 3,
            warningDurationHours: 8,
            dewPoint: round(dewPoint, 1),
        };
    }

    if (latestHumidity >= 60 || (dewPoint ?? -Infinity) >= 15) {
        return {
            status: 'yellow',
            riskScore: 56,
            explanation: `Humidity is trending high at ${round(latestHumidity, 0)}%.`,
            dangerDurationHours: 0,
            warningDurationHours: 4,
            dewPoint: round(dewPoint, 1),
        };
    }

    return {
        status: 'green',
        riskScore: 18,
        explanation: 'Humidity is staying below the usual warning range.',
        dangerDurationHours: 0,
        warningDurationHours: 0,
        dewPoint: round(dewPoint, 1),
    };
}

export function getMockWeatherHistory({ startTime, endTime, stepMinutes = 60 } = {}) {
    const endTimestamp = normalizeTimestamp(endTime, Date.now());
    const startTimestamp = normalizeTimestamp(startTime, endTimestamp - DEFAULT_WEATHER_WINDOW_MS);
    const stepMs = Math.max(15, stepMinutes) * 60 * 1000;
    const points = [];

    for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += stepMs) {
        points.push(buildMockWeatherPoint(timestamp));
    }

    if (!points.length) {
        points.push(buildMockWeatherPoint(endTimestamp));
    }

    return points;
}

export function buildDevAiContext() {
    const sensorReadings = getMockSensorData();
    const weatherHistory = getMockWeatherHistory();
    const latestWeatherPoint = weatherHistory[weatherHistory.length - 1] || null;

    const rooms = DEV_CONNECTIONS.map((connection) => {
        const roomReadings = sensorReadings.filter((reading) => reading.sensor_box === connection.name);
        const groupedSensors = new Map();

        roomReadings.forEach((reading) => {
            if (!groupedSensors.has(reading.sensor_type)) {
                groupedSensors.set(reading.sensor_type, []);
            }

            groupedSensors.get(reading.sensor_type).push({
                timestamp: reading.timestamp,
                value: Number(reading.value),
            });
        });

        const sensors = {};
        groupedSensors.forEach((points, sensorType) => {
            const summary = summarizeSeries(points, SENSOR_SAMPLE_POINTS);
            if (!summary) {
                return;
            }

            sensors[sensorType] = {
                unit: SENSOR_UNITS[sensorType] || '',
                ...summary,
            };
        });

        const latestTemperature = sensors.temperature?.latest?.value;
        const latestHumidity = sensors.humidity?.latest?.value;
        const lastSeen = Object.values(sensors)
            .map((sensor) => new Date(sensor.latest?.timestamp).getTime())
            .filter(Number.isFinite)
            .sort((left, right) => right - left)[0];

        return {
            roomName: connection.name,
            boxId: connection.name,
            address: connection.address,
            lastSeen: Number.isFinite(lastSeen) ? new Date(lastSeen).toISOString() : null,
            sensors,
            moldRisk: buildMoldRisk(latestTemperature, latestHumidity),
        };
    }).filter((room) => Object.keys(room.sensors).length > 0);

    return {
        source: 'mock-dev',
        generatedAt: new Date().toISOString(),
        historyWindow: 'last 24 hours',
        rooms,
        weather: {
            location: 'Mock Outdoor',
            current: latestWeatherPoint
                ? {
                    temperature: latestWeatherPoint.outdoor_temp,
                    temperature_unit: 'C',
                    humidity: latestWeatherPoint.outdoor_humidity,
                    humidity_unit: '%',
                    wind_speed: latestWeatherPoint.wind_speed,
                    wind_speed_unit: 'km/h',
                    precipitation: latestWeatherPoint.precipitation,
                    precipitation_unit: 'mm',
                    timestamp: latestWeatherPoint.timestamp,
                }
                : null,
            metrics: {
                outdoor_temp: summarizeSeries(
                    weatherHistory.map((reading) => ({
                        timestamp: reading.timestamp,
                        value: reading.outdoor_temp,
                    })),
                    WEATHER_SAMPLE_POINTS
                ),
                outdoor_humidity: summarizeSeries(
                    weatherHistory.map((reading) => ({
                        timestamp: reading.timestamp,
                        value: reading.outdoor_humidity,
                    })),
                    WEATHER_SAMPLE_POINTS
                ),
            },
        },
        notificationRules: [],
    };
}
