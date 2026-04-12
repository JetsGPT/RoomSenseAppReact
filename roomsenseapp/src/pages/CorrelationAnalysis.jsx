import React, { useEffect, useMemo, useState } from 'react';
import { CloudSun, Droplets, Loader2 } from 'lucide-react';
import { useConnections } from '../contexts/ConnectionsContext';
import { useWeather } from '../contexts/WeatherContext';
import { useSensorData } from '../hooks/useSensorData';
import {
    calculateCorrelation,
    calculateDewPoint,
    calculateHeatIndex,
    pairSensorData,
} from '../lib/correlationUtils';
import { getRangeStartDate } from '../lib/timeRange';
import {
    DATA_LIMITS,
    getSensorColor,
    getSensorIcon,
    getSensorName,
    getSensorUnit,
} from '../config/sensorConfig';
import MetricSelector from '../components/ui/MetricSelector';
import CorrelationChart from '../components/ui/CorrelationChart';
import DerivedValueCard from '../components/ui/DerivedValueCard';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getConnectionBoxId, getConnectionDisplayName } from '../lib/connectionIdentity';

const DEFAULT_INDOOR_METRICS = ['temperature', 'humidity', 'pressure', 'light'];
const SENSOR_PAIR_TOLERANCE_MS = 60 * 1000;
const WEATHER_PAIR_TOLERANCE_MS = 30 * 60 * 1000;

const OUTDOOR_METRIC_OPTIONS = [
    {
        value: 'outdoor_temp',
        label: 'Outside Temperature',
        icon: CloudSun,
        unit: ' C',
        color: '#0ea5e9',
        source: 'outdoor',
        sensorType: 'temperature',
    },
    {
        value: 'outdoor_humidity',
        label: 'Outside Humidity',
        icon: Droplets,
        unit: '%',
        color: '#38bdf8',
        source: 'outdoor',
        sensorType: 'humidity',
    },
];

const formatHistoryDate = (date) => date.toISOString().split('T')[0];

const normalizeIndoorSeries = (readings, metricKey, startTimestamp) => (
    Array.isArray(readings)
        ? readings
            .filter((reading) => reading?.sensor_type === metricKey)
            .map((reading) => ({
                timestamp: new Date(reading.timestamp).getTime(),
                value: Number(reading.value),
            }))
            .filter((reading) => (
                Number.isFinite(reading.timestamp)
                && Number.isFinite(reading.value)
                && reading.timestamp >= startTimestamp
            ))
            .sort((left, right) => left.timestamp - right.timestamp)
        : []
);

const normalizeOutdoorSeries = (readings, metricKey, startTimestamp) => {
    const weatherKey = metricKey === 'outdoor_temp' ? 'outdoor_temp' : 'outdoor_humidity';

    return Array.isArray(readings)
        ? readings
            .map((reading) => ({
                timestamp: Number(reading?.timestamp),
                value: Number(reading?.[weatherKey]),
            }))
            .filter((reading) => (
                Number.isFinite(reading.timestamp)
                && Number.isFinite(reading.value)
                && reading.timestamp >= startTimestamp
            ))
            .sort((left, right) => left.timestamp - right.timestamp)
        : [];
};

const describeCorrelation = (correlation, pairCount) => {
    if (pairCount < 2 || correlation == null) {
        return 'Not enough paired readings yet';
    }

    if (correlation > 0.7) {
        return 'Strong positive correlation';
    }

    if (correlation < -0.7) {
        return 'Strong negative correlation';
    }

    if (Math.abs(correlation) < 0.3) {
        return 'Weak or no correlation';
    }

    return 'Moderate correlation';
};

const CorrelationAnalysis = () => {
    const { activeConnections } = useConnections();
    const { getHistory, location, locationLoading } = useWeather();

    const availableBoxes = useMemo(() =>
        activeConnections
            .map((connection) => {
                const id = getConnectionBoxId(connection);
                if (!id) {
                    return null;
                }

                return {
                    id,
                    label: getConnectionDisplayName(connection, id),
                };
            })
            .filter(Boolean),
        [activeConnections]
    );

    const [selectedBoxId, setSelectedBoxId] = useState('');
    const [xMetric, setXMetric] = useState('temperature');
    const [yMetric, setYMetric] = useState('humidity');
    const [timeRange, setTimeRange] = useState('24h');
    const [weatherHistory, setWeatherHistory] = useState([]);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState(null);

    useEffect(() => {
        if (!availableBoxes.length) {
            setSelectedBoxId('');
            return;
        }

        const stillSelected = availableBoxes.some((box) => box.id === selectedBoxId);
        if (!stillSelected) {
            setSelectedBoxId(availableBoxes[0].id);
        }
    }, [availableBoxes, selectedBoxId]);

    const indoorMetricOptions = useMemo(() => {
        const keys = new Set(DEFAULT_INDOOR_METRICS);

        return Array.from(keys).map((metric) => ({
            value: metric,
            label: getSensorName(metric),
            icon: getSensorIcon(metric),
            unit: getSensorUnit(metric),
            color: getSensorColor(metric),
            source: 'indoor',
            sensorType: metric,
        }));
    }, []);

    const metricOptions = useMemo(
        () => [...indoorMetricOptions, ...OUTDOOR_METRIC_OPTIONS],
        [indoorMetricOptions]
    );

    const metricOptionMap = useMemo(
        () => new Map(metricOptions.map((option) => [option.value, option])),
        [metricOptions]
    );

    useEffect(() => {
        if (!metricOptionMap.has(xMetric)) {
            setXMetric(metricOptions[0]?.value || 'temperature');
        }

        if (!metricOptionMap.has(yMetric)) {
            setYMetric(metricOptions[1]?.value || metricOptions[0]?.value || 'humidity');
        }
    }, [metricOptionMap, metricOptions, xMetric, yMetric]);

    const xMetricMeta = metricOptionMap.get(xMetric) || metricOptions[0];
    const yMetricMeta = metricOptionMap.get(yMetric) || metricOptions[1] || metricOptions[0];
    const usesIndoorData = [xMetricMeta, yMetricMeta].some((metric) => metric?.source === 'indoor');
    const usesOutdoorData = [xMetricMeta, yMetricMeta].some((metric) => metric?.source === 'outdoor');

    const {
        data,
        loading: indoorLoading,
        error: indoorError,
    } = useSensorData({
        sensor_box: selectedBoxId,
        timeRange: `-${timeRange}`,
        limit: DATA_LIMITS.export,
        enabled: usesIndoorData && Boolean(selectedBoxId),
    });

    useEffect(() => {
        if (!usesOutdoorData) {
            setWeatherHistory([]);
            setWeatherLoading(false);
            setWeatherError(null);
            return;
        }

        if (locationLoading) {
            return;
        }

        let active = true;

        const loadWeatherHistory = async () => {
            setWeatherLoading(true);
            setWeatherError(null);

            try {
                const endDate = new Date();
                const startDate = getRangeStartDate(timeRange, endDate) || new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
                const history = await getHistory(formatHistoryDate(startDate), formatHistoryDate(endDate));

                if (!active) {
                    return;
                }

                const nextHistory = Array.isArray(history) ? history : [];
                setWeatherHistory(nextHistory);

                if (nextHistory.length === 0) {
                    setWeatherError(
                        location?.name
                            ? `No outdoor weather history is available for the selected ${timeRange} range.`
                            : 'Outdoor weather data is unavailable. Set or refresh the weather location first.'
                    );
                }
            } catch (err) {
                console.error('Failed to load outdoor weather history for correlation analysis', err);
                if (active) {
                    setWeatherHistory([]);
                    setWeatherError('Failed to load outdoor weather history.');
                }
            } finally {
                if (active) {
                    setWeatherLoading(false);
                }
            }
        };

        loadWeatherHistory();

        return () => {
            active = false;
        };
    }, [getHistory, location?.latitude, location?.longitude, location?.name, locationLoading, timeRange, usesOutdoorData]);

    const processedData = useMemo(() => {
        const startDate = getRangeStartDate(timeRange, new Date());
        const startTimestamp = startDate?.getTime() ?? 0;

        const xSeries = xMetricMeta?.source === 'outdoor'
            ? normalizeOutdoorSeries(weatherHistory, xMetric, startTimestamp)
            : normalizeIndoorSeries(data, xMetric, startTimestamp);
        const ySeries = yMetricMeta?.source === 'outdoor'
            ? normalizeOutdoorSeries(weatherHistory, yMetric, startTimestamp)
            : normalizeIndoorSeries(data, yMetric, startTimestamp);

        if (!xSeries.length || !ySeries.length) {
            return {
                paired: [],
                correlation: null,
                heatIndex: null,
                dewPoint: null,
                xCount: xSeries.length,
                yCount: ySeries.length,
            };
        }

        const toleranceMs = xMetricMeta?.source === 'outdoor' || yMetricMeta?.source === 'outdoor'
            ? WEATHER_PAIR_TOLERANCE_MS
            : SENSOR_PAIR_TOLERANCE_MS;

        const paired = pairSensorData(xSeries, ySeries, toleranceMs);
        const correlation = calculateCorrelation(paired);

        let heatIndex = null;
        let dewPoint = null;

        const sameSource = xMetricMeta?.source === yMetricMeta?.source;
        const includesTemperature = [xMetricMeta?.sensorType, yMetricMeta?.sensorType].includes('temperature');
        const includesHumidity = [xMetricMeta?.sensorType, yMetricMeta?.sensorType].includes('humidity');

        if (sameSource && includesTemperature && includesHumidity) {
            const lastPair = paired[paired.length - 1];
            if (lastPair) {
                const temperature = xMetricMeta?.sensorType === 'temperature' ? lastPair.x : lastPair.y;
                const humidity = xMetricMeta?.sensorType === 'humidity' ? lastPair.x : lastPair.y;

                heatIndex = calculateHeatIndex(temperature, humidity);
                dewPoint = calculateDewPoint(temperature, humidity);
            }
        }

        return {
            paired,
            correlation,
            heatIndex,
            dewPoint,
            xCount: xSeries.length,
            yCount: ySeries.length,
        };
    }, [data, timeRange, weatherHistory, xMetric, xMetricMeta, yMetric, yMetricMeta]);

    const isLoading = indoorLoading || (usesOutdoorData && (weatherLoading || locationLoading));
    const primaryError = indoorError?.message
        || (usesIndoorData && !selectedBoxId ? 'Select a sensor box to use indoor metrics.' : null)
        || weatherError;

    if (!activeConnections.length) {
        return <div className="p-8 text-center text-muted-foreground">No active sensor connections found.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Correlation Analysis</h1>
                    <p className="text-muted-foreground">Analyze relationships between indoor sensor metrics and outside weather conditions.</p>
                </div>

                <Select value={selectedBoxId} onValueChange={setSelectedBoxId}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select Sensor Box" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableBoxes.map((box) => (
                            <SelectItem key={box.id} value={box.id}>
                                {box.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card className="border-dashed">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                    Indoor metrics use the selected sensor box. Outdoor metrics use the saved weather location from the Weather page{location?.name ? ` (${location.name})` : ''}.
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">X-Axis Metric</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MetricSelector
                            value={xMetric}
                            onChange={setXMetric}
                            options={metricOptions}
                            label=""
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Y-Axis Metric</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MetricSelector
                            value={yMetric}
                            onChange={setYMetric}
                            options={metricOptions}
                            label=""
                        />
                    </CardContent>
                </Card>

                <DerivedValueCard
                    type="correlation"
                    label="Correlation (r)"
                    value={processedData.correlation}
                    description={describeCorrelation(processedData.correlation, processedData.paired.length)}
                />

                {processedData.heatIndex !== null && (
                    <DerivedValueCard
                        type="heatIndex"
                        label={`${xMetricMeta?.source === 'outdoor' ? 'Outdoor' : 'Indoor'} Heat Index`}
                        value={processedData.heatIndex}
                        unit=" C"
                        description="Feels-like temperature"
                    />
                )}

                {processedData.dewPoint !== null && (
                    <DerivedValueCard
                        type="dewPoint"
                        label="Dew Point"
                        value={processedData.dewPoint}
                        unit=" C"
                        description="Temperature where dew forms"
                    />
                )}
            </div>

            {primaryError && (
                <Card className="border-dashed">
                    <CardContent className="pt-6 text-sm text-muted-foreground">
                        {primaryError}
                    </CardContent>
                </Card>
            )}

            <div className="min-h-[400px]">
                {isLoading && !processedData.paired.length ? (
                    <div className="h-[400px] flex items-center justify-center border rounded-xl bg-card/50">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <CorrelationChart
                        data={processedData.paired}
                        xMetric={xMetric}
                        yMetric={yMetric}
                        xLabel={xMetricMeta?.label}
                        yLabel={yMetricMeta?.label}
                        xUnit={xMetricMeta?.unit}
                        yUnit={yMetricMeta?.unit}
                        chartColor={xMetricMeta?.color}
                        initialRange={timeRange}
                        onRangeChange={setTimeRange}
                    />
                )}
            </div>
        </div>
    );
};

export default CorrelationAnalysis;
