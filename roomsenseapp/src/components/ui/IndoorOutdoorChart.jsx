import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card'; // Corrected import path
import { Button } from './button'; // Corrected import path
import {
    getSensorName,
    getSensorUnit,
    getSensorColor,
    formatSensorValue,
    CHART_CONFIG
} from '../../config/sensorConfig';
import {
    filterDataByRange,
    CHART_RANGE_OPTIONS,
    DEFAULT_CHART_RANGE,
    ensureRangeKey
} from '../../lib/timeRange';
import { useSettings } from '../../contexts/SettingsContext';

const MS_IN_HOUR = 3600 * 1000;
const MS_IN_DAY = 24 * 3600 * 1000;

// Reusing time formatter from SensorCharts logic
const createTimeFormatter = (span) => {
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
    return (val) => formatter.format(new Date(val));
};

export const IndoorOutdoorChart = ({
    indoorData,
    outdoorData,
    sensorType, // 'temperature' or 'humidity'
    rangeOptions,
    initialRange,
    onRangeChange, // New prop
    title
}) => {
    // -------------------------------------------------------------------------
    // Config & Hooks
    // -------------------------------------------------------------------------
    const { settings } = useSettings();
    const showDots = settings?.showChartDots ?? true;
    const indoorColor = getSensorColor(sensorType);
    const indoorUnit = getSensorUnit(sensorType);
    const outdoorColor = '#fbbf24'; // Amber-400 for outdoor contrast

    // -------------------------------------------------------------------------
    // Range State
    // -------------------------------------------------------------------------
    const [selectedRange, setSelectedRange] = useState(initialRange || DEFAULT_CHART_RANGE);

    // Notify parent when range changes
    React.useEffect(() => {
        if (onRangeChange) {
            onRangeChange(selectedRange);
        }
    }, [selectedRange, onRangeChange]);

    const options = rangeOptions || CHART_RANGE_OPTIONS;

    // -------------------------------------------------------------------------
    // Data Processing
    // -------------------------------------------------------------------------

    // 1. Filter indoor data by range
    const filteredIndoor = useMemo(() =>
        filterDataByRange(indoorData || [], selectedRange),
        [indoorData, selectedRange]);

    // 2. Filter outdoor data by range (approximate, since timestamps might differ)
    // We assume outdoorData provided is already roughly in range, but safety filter helps.
    const filteredOutdoor = useMemo(() =>
        filterDataByRange(outdoorData || [], selectedRange),
        [outdoorData, selectedRange]);

    // 3. Merge Data for Recharts
    // We need a unified X-axis. Since timestamps differ, we can:
    // A) Resample/Interpolate (Complex)
    // B) Union of timestamps (Simple, Recharts handles gaps)
    // We'll go with B.

    const mergedData = useMemo(() => {
        const map = new Map();

        // Add indoor
        filteredIndoor.forEach(d => {
            const time = new Date(d.timestamp).getTime();
            // Rounded to nearest minute to help align if close? 
            // For now, raw timestamp.
            map.set(time, {
                timestamp: time,
                indoor: d.value,
                outdoor: null
            });
        });

        // Add outdoor
        filteredOutdoor.forEach(d => {
            const time = new Date(d.timestamp).getTime();
            const existing = map.get(time) || { timestamp: time, indoor: null };

            // Map outdoor fields based on sensorType
            let val = null;
            if (sensorType === 'temperature') val = d.outdoor_temp;
            if (sensorType === 'humidity') val = d.outdoor_humidity;

            existing.outdoor = val;
            map.set(time, existing);
        });

        return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    }, [filteredIndoor, filteredOutdoor, sensorType]);

    // -------------------------------------------------------------------------
    // Formatters
    // -------------------------------------------------------------------------
    const timeSpan = useMemo(() => {
        if (!mergedData.length) return 0;
        return mergedData[mergedData.length - 1].timestamp - mergedData[0].timestamp;
    }, [mergedData]);

    const formatXAxis = useMemo(() => createTimeFormatter(timeSpan), [timeSpan]);

    const formatTooltipValue = (value, name) => {
        if (value === null || value === undefined) return ['-', name];
        return [`${formatSensorValue(value, sensorType)}${indoorUnit}`, name === 'indoor' ? 'Indoor' : 'Outdoor'];
    };

    const formatTooltipLabel = (label) => {
        return new Date(label).toLocaleString();
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <CardTitle>{title || `${getSensorName(sensorType)} Comparison`}</CardTitle>
                        <CardDescription>Indoor vs. Outdoor Conditions</CardDescription>
                    </div>
                    {/* Range Selector */}
                    <div className="flex gap-1">
                        {options.map(opt => (
                            <Button
                                key={opt}
                                variant={selectedRange === opt ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setSelectedRange(opt)}
                                className="h-8 px-2 text-xs"
                            >
                                {opt}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatXAxis}
                                minTickGap={30}
                                fontSize={12}
                                stroke="currentColor"
                                opacity={0.5}
                            />
                            <YAxis
                                fontSize={12}
                                stroke="currentColor"
                                opacity={0.5}
                                width={35}
                            />
                            <Tooltip
                                labelFormatter={formatTooltipLabel}
                                formatter={formatTooltipValue}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />

                            {/* Indoor Line */}
                            <Line
                                type="monotone"
                                dataKey="indoor"
                                name="Indoor"
                                stroke={indoorColor}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                            />

                            {/* Outdoor Line */}
                            <Line
                                type="monotone"
                                dataKey="outdoor"
                                name="Outdoor"
                                stroke={outdoorColor}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
