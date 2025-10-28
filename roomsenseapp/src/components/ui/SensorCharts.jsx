import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './chart';
import { Button } from './button';
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

const RangeSelector = ({ options, selected, onSelect }) => {
    if (!options || options.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1">
            {options.map((option) => (
                <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={option === selected ? 'default' : 'ghost'}
                    onClick={() => onSelect(option)}
                >
                    {option}
                </Button>
            ))}
        </div>
    );
};

const useRangeState = (rangeOptions, initialRange) => {
    const options = useMemo(() => (
        Array.isArray(rangeOptions) && rangeOptions.length > 0
            ? rangeOptions
            : CHART_RANGE_OPTIONS
    ), [rangeOptions]);

    const [selectedRange, setSelectedRange] = useState(() => ensureRangeKey(initialRange || DEFAULT_CHART_RANGE, options));

    useEffect(() => {
        setSelectedRange((prev) => ensureRangeKey(prev, options));
    }, [options]);

    useEffect(() => {
        if (initialRange) {
            setSelectedRange(ensureRangeKey(initialRange, options));
        }
    }, [initialRange, options]);

    const handleSelect = useCallback((nextRange) => {
        const validRange = ensureRangeKey(nextRange, options);
        setSelectedRange(validRange);
        return validRange;
    }, [options]);

    return { options, selectedRange, handleSelect };
};

const MotionDiv = motion.div;

export function SensorLineChart({ data, sensorType, color, unit, rangeOptions, initialRange, onRangeChange }) {
    // Use centralized config if not provided
    const sensorColor = color || getSensorColor(sensorType);
    const sensorUnit = unit || getSensorUnit(sensorType);
    const sensorName = getSensorName(sensorType);

    const { options, selectedRange, handleSelect } = useRangeState(rangeOptions, initialRange || DEFAULT_CHART_RANGE);

    const handleRangeChange = useCallback((rangeKey) => {
        const resolvedRange = handleSelect(rangeKey);
        if (onRangeChange) {
            onRangeChange(resolvedRange);
        }
    }, [handleSelect, onRangeChange]);

    const filteredData = useMemo(() => filterDataByRange(data || [], selectedRange), [data, selectedRange]);

    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value) => {
        const formattedValue = formatSensorValue(value, sensorType);
        return [`${formattedValue}${sensorUnit}`, sensorName];
    };

    const chartConfig = {
        value: {
            label: sensorName,
            color: sensorColor,
        },
    };

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -2 }}
        >
            <Card className="w-full rounded-3xl overflow-hidden shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground">
                        {sensorName} Over Time
                    </CardTitle>
                        <RangeSelector options={options} selected={selectedRange} onSelect={handleRangeChange} />
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <ChartContainer config={chartConfig} className={`h-[${CHART_CONFIG.defaultHeight}px] rounded-2xl`}>
                        <LineChart data={filteredData} margin={CHART_CONFIG.margins}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                            <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={formatXAxis}
                                fontSize={10}
                                tick={{ fill: 'currentColor', opacity: 0.7 }}
                            />
                            <YAxis fontSize={10} tick={{ fill: 'currentColor', opacity: 0.7 }} />
                            <ChartTooltip 
                                content={<ChartTooltipContent formatter={formatTooltip} />}
                                wrapperClassName="rounded-xl"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={sensorColor} 
                                strokeWidth={CHART_CONFIG.strokeWidth + 1}
                                dot={{ fill: sensorColor, strokeWidth: CHART_CONFIG.strokeWidth, r: CHART_CONFIG.dotRadius + 1 }}
                                activeDot={{ r: CHART_CONFIG.activeDotRadius + 2, stroke: sensorColor, strokeWidth: CHART_CONFIG.strokeWidth + 1 }}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </MotionDiv>
    );
}

export function SensorAreaChart({ data, sensorType, color, unit, rangeOptions, initialRange, onRangeChange }) {
    // Use centralized config if not provided
    const sensorColor = color || getSensorColor(sensorType);
    const sensorUnit = unit || getSensorUnit(sensorType);
    const sensorName = getSensorName(sensorType);

    const { options, selectedRange, handleSelect } = useRangeState(rangeOptions, initialRange || DEFAULT_CHART_RANGE);

    const handleRangeChange = useCallback((rangeKey) => {
        const resolvedRange = handleSelect(rangeKey);
        if (onRangeChange) {
            onRangeChange(resolvedRange);
        }
    }, [handleSelect, onRangeChange]);

    const filteredData = useMemo(() => filterDataByRange(data || [], selectedRange), [data, selectedRange]);

    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value) => {
        const formattedValue = formatSensorValue(value, sensorType);
        return [`${formattedValue}${sensorUnit}`, sensorName];
    };

    const chartConfig = {
        value: {
            label: sensorName,
            color: sensorColor,
        },
    };

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -2 }}
        >
            <Card className="w-full">
                <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-lg font-medium">
                        {sensorName} Trend
                    </CardTitle>
                        <RangeSelector options={options} selected={selectedRange} onSelect={handleRangeChange} />
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className={`h-[${CHART_CONFIG.defaultHeight}px]`}>
                        <AreaChart data={filteredData} margin={CHART_CONFIG.margins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={formatXAxis}
                                fontSize={10}
                            />
                            <YAxis fontSize={10} />
                            <ChartTooltip 
                                content={<ChartTooltipContent formatter={formatTooltip} />}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={sensorColor} 
                                fill={sensorColor}
                                fillOpacity={0.2}
                                strokeWidth={CHART_CONFIG.strokeWidth}
                            />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </MotionDiv>
    );
}

export function MultiSensorChart({ data, title, colors, rangeOptions, initialRange, onRangeChange }) {
    const { options, selectedRange, handleSelect } = useRangeState(rangeOptions, initialRange || DEFAULT_CHART_RANGE);

    const handleRangeChange = useCallback((rangeKey) => {
        const resolvedRange = handleSelect(rangeKey);
        if (onRangeChange) {
            onRangeChange(resolvedRange);
        }
    }, [handleSelect, onRangeChange]);

    const filteredData = useMemo(() => filterDataByRange(data || [], selectedRange), [data, selectedRange]);

    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value, name) => {
        const unit = getSensorUnit(name);
        const formattedValue = formatSensorValue(value, name);
        return [`${formattedValue}${unit}`, getSensorName(name)];
    };

    // Use centralized colors if not provided
    const chartColors = colors || CHART_CONFIG.colors;
    
    const chartConfig = Object.entries(chartColors).reduce((config, [sensorType, color]) => {
        config[sensorType] = {
            label: getSensorName(sensorType),
            color: color,
        };
        return config;
    }, {});

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -2 }}
        >
            <Card className="w-full">
                <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-lg font-medium">
                        {title}
                    </CardTitle>
                        <RangeSelector options={options} selected={selectedRange} onSelect={handleRangeChange} />
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className={`h-[${CHART_CONFIG.multiSensorHeight}px]`}>
                        <LineChart data={filteredData} margin={CHART_CONFIG.margins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={formatXAxis}
                                fontSize={10}
                            />
                            <YAxis fontSize={10} />
                            <ChartTooltip 
                                content={<ChartTooltipContent formatter={formatTooltip} />}
                            />
                            {Object.entries(chartColors).map(([sensorType, color]) => (
                                <Line 
                                    key={sensorType}
                                    type="monotone" 
                                    dataKey={sensorType} 
                                    stroke={color} 
                                    strokeWidth={CHART_CONFIG.strokeWidth}
                                    dot={{ fill: color, strokeWidth: CHART_CONFIG.strokeWidth, r: CHART_CONFIG.dotRadius }}
                                    activeDot={{ r: CHART_CONFIG.activeDotRadius, stroke: color, strokeWidth: CHART_CONFIG.strokeWidth }}
                                />
                            ))}
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </MotionDiv>
    );
}
