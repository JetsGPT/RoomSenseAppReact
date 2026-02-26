import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegendContent } from './chart';
import {
    getSensorColor,
    getSensorUnit,
    getSensorName,
    formatSensorValue,
    CHART_CONFIG
} from '../../config/sensorConfig';
import { useSettings } from '../../contexts/SettingsContext';

const MS_IN_HOUR = 60 * 60 * 1000;
const MS_IN_DAY = 24 * MS_IN_HOUR;

/**
 * Creates an adaptive Intl.DateTimeFormat-based tick formatter
 * based on the total time span of the data.
 */
const createTimeFormatter = (data) => {
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = new Date(data[0]?.timestamp).getTime();
    const last = new Date(data[data.length - 1]?.timestamp).getTime();
    if (isNaN(first) || isNaN(last)) return null;

    const span = Math.abs(last - first);

    let options;
    if (span <= 6 * MS_IN_HOUR) {
        options = { hour: '2-digit', minute: '2-digit' };
    } else if (span <= 2 * MS_IN_DAY) {
        options = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
    } else if (span <= 14 * MS_IN_DAY) {
        options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    } else {
        options = { month: 'short', day: 'numeric' };
    }

    const formatter = new Intl.DateTimeFormat(undefined, options);
    return (value) => {
        const ts = typeof value === 'number' ? value : new Date(value).getTime();
        return isNaN(ts) ? '' : formatter.format(new Date(ts));
    };
};

const MotionDiv = motion.div;

/**
 * HistoryChart — Visualizes Temperature and Humidity together
 * on a shared time axis with dual Y-axes.
 *
 * @param {{ data: Array<{ timestamp: string|number, temperature?: number, humidity?: number }>, title?: string, className?: string }} props
 */
export function HistoryChart({ data, title = '24h History', className }) {
    const { settings } = useSettings();
    const showDots = settings?.showChartDots ?? true;

    const tempColor = getSensorColor('temperature');
    const humidColor = getSensorColor('humidity');
    const tempUnit = getSensorUnit('temperature');
    const humidUnit = getSensorUnit('humidity');
    const tempName = getSensorName('temperature');
    const humidName = getSensorName('humidity');

    // Ensure data is an array sorted by timestamp
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];
        return data.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [data]);

    const timeFormatter = useMemo(() => createTimeFormatter(chartData), [chartData]);

    const formatXAxis = useCallback(
        (tickItem) => {
            if (timeFormatter) return timeFormatter(tickItem);
            const date = new Date(tickItem);
            return isNaN(date.getTime())
                ? ''
                : date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
        },
        [timeFormatter]
    );

    const tooltipLabelFormatter = useCallback(
        (label, payload) => {
            const ts = payload?.[0]?.payload?.timestamp || label;
            if (timeFormatter) return timeFormatter(ts);
            const date = new Date(ts);
            return isNaN(date.getTime()) ? '' : date.toLocaleString();
        },
        [timeFormatter]
    );

    const formatTooltip = useCallback(
        (value, name) => {
            if (value === null || value === undefined) return ['-', name];
            const sensorType = name === 'temperature' ? 'temperature' : 'humidity';
            const unit = sensorType === 'temperature' ? tempUnit : humidUnit;
            const label = sensorType === 'temperature' ? tempName : humidName;
            return [`${formatSensorValue(value, sensorType)}${unit}`, label];
        },
        [tempUnit, humidUnit, tempName, humidName]
    );

    const chartConfig = {
        temperature: {
            label: tempName,
            color: tempColor,
        },
        humidity: {
            label: humidName,
            color: humidColor,
        },
    };

    if (chartData.length === 0) return null;

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            whileHover={{ y: -2 }}
            className={className}
        >
            <Card className="w-full rounded-3xl overflow-hidden shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-foreground">
                        {title}
                    </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                    <ChartContainer config={chartConfig} className="h-[300px] rounded-2xl">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />

                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatXAxis}
                                fontSize={10}
                                minTickGap={30}
                                tick={{ fill: 'currentColor', opacity: 0.7 }}
                            />

                            {/* Left Y-axis — Temperature */}
                            <YAxis
                                yAxisId="temp"
                                fontSize={10}
                                tick={{ fill: tempColor, opacity: 0.8 }}
                                tickFormatter={(v) => `${v}°`}
                                width={40}
                            />

                            {/* Right Y-axis — Humidity */}
                            <YAxis
                                yAxisId="humid"
                                orientation="right"
                                fontSize={10}
                                tick={{ fill: humidColor, opacity: 0.8 }}
                                tickFormatter={(v) => `${v}%`}
                                width={40}
                            />

                            <ChartTooltip
                                labelFormatter={tooltipLabelFormatter}
                                content={<ChartTooltipContent formatter={formatTooltip} />}
                                wrapperClassName="rounded-xl"
                            />

                            <Legend content={<ChartLegendContent />} />

                            {/* Temperature line */}
                            <Line
                                yAxisId="temp"
                                type="monotone"
                                dataKey="temperature"
                                name="temperature"
                                stroke={tempColor}
                                strokeWidth={CHART_CONFIG.strokeWidth + 1}
                                dot={
                                    showDots
                                        ? { fill: tempColor, strokeWidth: CHART_CONFIG.strokeWidth, r: CHART_CONFIG.dotRadius }
                                        : false
                                }
                                activeDot={
                                    showDots
                                        ? { r: CHART_CONFIG.activeDotRadius + 1, stroke: tempColor, strokeWidth: CHART_CONFIG.strokeWidth }
                                        : false
                                }
                                connectNulls
                            />

                            {/* Humidity line */}
                            <Line
                                yAxisId="humid"
                                type="monotone"
                                dataKey="humidity"
                                name="humidity"
                                stroke={humidColor}
                                strokeWidth={CHART_CONFIG.strokeWidth + 1}
                                dot={
                                    showDots
                                        ? { fill: humidColor, strokeWidth: CHART_CONFIG.strokeWidth, r: CHART_CONFIG.dotRadius }
                                        : false
                                }
                                activeDot={
                                    showDots
                                        ? { r: CHART_CONFIG.activeDotRadius + 1, stroke: humidColor, strokeWidth: CHART_CONFIG.strokeWidth }
                                        : false
                                }
                                connectNulls
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </MotionDiv>
    );
}

export default HistoryChart;
