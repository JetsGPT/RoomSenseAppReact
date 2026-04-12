import React, { useState, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { aiAPI } from '../services/aiAPI';
import { sensorsAPI } from '../services/sensorsAPI';
import { useWeather } from '../contexts/WeatherContext';
import { DEV_MODE } from '../config/devConfig';
import { getMockWeatherHistory } from '../services/devAiContext';

const TIME_RANGES = [
    { label: 'Last 1 Minute', value: '-1m', hours: 1 / 60 },
    { label: 'Last 5 Minutes', value: '-5m', hours: 5 / 60 },
    { label: 'Last 12 Hours', value: '-12h', hours: 12 },
    { label: 'Last 24 Hours', value: '-24h', hours: 24 },
    { label: 'Last 7 Days', value: '-7d', hours: 168 }
];

const MAX_SENSOR_SAMPLE_POINTS = 8;
const MAX_WEATHER_SAMPLE_POINTS = 12;

function normalizeTimestamp(value) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
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
    const normalizedPoints = points
        .map((point) => ({
            timestamp: normalizeTimestamp(point.timestamp),
            value: Number(point.value),
        }))
        .filter((point) => point.timestamp != null && Number.isFinite(point.value))
        .sort((left, right) => left.timestamp - right.timestamp);

    if (normalizedPoints.length === 0) {
        return null;
    }

    const values = normalizedPoints.map((point) => point.value);
    const firstPoint = normalizedPoints[0];
    const lastPoint = normalizedPoints[normalizedPoints.length - 1];
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
        count: normalizedPoints.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: average,
        start: firstPoint,
        end: lastPoint,
        latest: lastPoint,
        delta: lastPoint.value - firstPoint.value,
        sample: downsamplePoints(normalizedPoints, maxSamplePoints),
    };
}

function buildSensorSummary(readings) {
    const seriesMap = new Map();

    for (const reading of readings) {
        const boxId = typeof reading?.sensor_box === 'string' ? reading.sensor_box : '';
        const sensorType = typeof reading?.sensor_type === 'string' ? reading.sensor_type : '';
        const value = Number(reading?.value);
        const timestamp = reading?.timestamp;

        if (!boxId || !sensorType || !Number.isFinite(value) || !timestamp) {
            continue;
        }

        const key = `${boxId}::${sensorType}`;
        if (!seriesMap.has(key)) {
            seriesMap.set(key, {
                boxId,
                sensorType,
                points: [],
            });
        }

        seriesMap.get(key).points.push({ timestamp, value });
    }

    const boxMap = new Map();

    for (const series of seriesMap.values()) {
        const summary = summarizeSeries(series.points, MAX_SENSOR_SAMPLE_POINTS);
        if (!summary) {
            continue;
        }

        if (!boxMap.has(series.boxId)) {
            boxMap.set(series.boxId, {
                boxId: series.boxId,
                sensors: [],
            });
        }

        boxMap.get(series.boxId).sensors.push({
            sensorType: series.sensorType,
            ...summary,
        });
    }

    const boxes = Array.from(boxMap.values())
        .map((box) => ({
            ...box,
            sensors: box.sensors.sort((left, right) => left.sensorType.localeCompare(right.sensorType)),
        }))
        .sort((left, right) => left.boxId.localeCompare(right.boxId));

    return {
        totalReadings: Array.isArray(readings) ? readings.length : 0,
        boxCount: boxes.length,
        sensorSeriesCount: boxes.reduce((count, box) => count + box.sensors.length, 0),
        boxes,
    };
}

function buildWeatherSummary(readings) {
    const temperaturePoints = [];
    const humidityPoints = [];

    for (const reading of readings) {
        const timestamp = normalizeTimestamp(reading?.timestamp);
        const temperature = Number(reading?.outdoor_temp);
        const humidity = Number(reading?.outdoor_humidity);

        if (timestamp == null) {
            continue;
        }

        if (Number.isFinite(temperature)) {
            temperaturePoints.push({ timestamp, value: temperature });
        }

        if (Number.isFinite(humidity)) {
            humidityPoints.push({ timestamp, value: humidity });
        }
    }

    return {
        totalReadings: Array.isArray(readings) ? readings.length : 0,
        metrics: {
            outdoor_temp: summarizeSeries(temperaturePoints, MAX_WEATHER_SAMPLE_POINTS),
            outdoor_humidity: summarizeSeries(humidityPoints, MAX_WEATHER_SAMPLE_POINTS),
        },
    };
}

export function AiInsights({ activeBoxes = [] }) {
    const { getHistory } = useWeather();
    const [timeRange, setTimeRange] = useState(TIME_RANGES[3]);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [error, setError] = useState(null);

    const generateInsights = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch sensor data for all active boxes
            const boxPromises = activeBoxes.map(boxId =>
                sensorsAPI.getSensorDataByBox(boxId, {
                    start_time: timeRange.value,
                    limit: 2000
                }).catch(() => [])
            );

            const results = await Promise.all([...boxPromises]);
            const flatSensorData = results.flat();

            // 2. Fetch weather history
            const end = new Date();
            const start = new Date(end.getTime() - (timeRange.hours * 60 * 60 * 1000));
            const weatherData = DEV_MODE
                ? getMockWeatherHistory({
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                })
                : await getHistory(start.toISOString(), end.toISOString());

            const sensorSummary = buildSensorSummary(flatSensorData);
            const weatherSummary = buildWeatherSummary(weatherData);

            if (sensorSummary.sensorSeriesCount === 0) {
                throw new Error('Not enough sensor history is available yet to generate insights.');
            }

            // 3. Send compact summaries to the backend instead of raw time-series arrays.
            const response = await aiAPI.analyze(sensorSummary, weatherSummary, timeRange.label);
            setInsights(response.analysis);

        } catch (err) {
            console.error('Failed to generate insights:', err);
            const apiError = err.response?.data;
            setError(
                apiError?.details
                    ? `${apiError.error}: ${apiError.details}`
                    : apiError?.error || err.message || 'Failed to generate insights'
            );
        } finally {
            setLoading(false);
        }
    }, [activeBoxes, timeRange, getHistory]);

    // Simple markdown rendering specifically for the insights output
    const renderMarkdown = (text) => {
        if (!text) return null;

        // Split by newlines
        const lines = text.split('\n');

        return lines.map((line, idx) => {
            if (line.trim().startsWith('##')) {
                return <h3 key={idx} className="text-md font-semibold mt-4 mb-2 text-primary">{line.replace(/##/g, '').trim()}</h3>;
            }
            if (line.trim().startsWith('#')) {
                return <h2 key={idx} className="text-lg font-bold mt-5 mb-3 text-primary">{line.replace(/#/g, '').trim()}</h2>;
            }
            if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                // Handle bolding within lists
                const content = line.substring(1).trim();
                const bolded = content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                });
                return <li key={idx} className="ml-4 list-disc mb-1">{bolded}</li>;
            }

            if (line.trim().length === 0) return <br key={idx} />;

            // Handle bolding in normal text
            const bolded = line.split(/(\*\*.*?\*\*)/).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            });

            return <p key={idx} className="mb-2">{bolded}</p>;
        });
    };

    return (
        <div className="bg-gradient-to-br from-card to-card/50 border border-primary/20 rounded-2xl p-5 shadow-sm overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-xl text-primary">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">AI Insights</h3>
                        <p className="text-xs text-muted-foreground">Smart analysis of your indoor & outdoor conditions</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative inline-flex bg-muted/50 rounded-lg p-1">
                        {TIME_RANGES.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange.value === range.value
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                    }`}
                                disabled={loading}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    <Button
                        size="sm"
                        onClick={generateInsights}
                        disabled={loading || activeBoxes.length === 0}
                        className="gap-2 shadow-md hover:shadow-lg transition-transform active:scale-95"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Generate
                    </Button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-3"
                    >
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm">Analyzing data and looking for patterns...</p>
                        <p className="text-xs opacity-70">This might take a few seconds</p>
                    </Motion.div>
                ) : error ? (
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20"
                    >
                        <p className="font-semibold mb-1">Analysis Failed</p>
                        <p>{error}</p>
                    </Motion.div>
                ) : insights ? (
                    <Motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-0 mt-4 px-2 max-h-[400px] overflow-y-auto pr-2"
                    >
                        {renderMarkdown(insights)}
                    </Motion.div>
                ) : (
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-10 text-center text-muted-foreground"
                    >
                        <p className="text-sm">Click generate to get an AI-powered breakdown of patterns and anomalies in your environment.</p>
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
