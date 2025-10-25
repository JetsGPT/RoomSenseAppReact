import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './chart';
import { 
    getSensorConfig, 
    getSensorName, 
    getSensorUnit, 
    getSensorColor,
    formatSensorValue,
    CHART_CONFIG 
} from '../../config/sensorConfig';

export function SensorLineChart({ data, sensorType, color, unit }) {
    // Use centralized config if not provided
    const sensorColor = color || getSensorColor(sensorType);
    const sensorUnit = unit || getSensorUnit(sensorType);
    const sensorName = getSensorName(sensorType);

    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value, name, props) => {
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -2 }}
        >
            <Card className="w-full rounded-3xl overflow-hidden shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-foreground">
                        {sensorName} Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <ChartContainer config={chartConfig} className={`h-[${CHART_CONFIG.defaultHeight}px] rounded-2xl`}>
                        <LineChart data={data} margin={CHART_CONFIG.margins}>
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
        </motion.div>
    );
}

export function SensorAreaChart({ data, sensorType, color, unit }) {
    // Use centralized config if not provided
    const sensorColor = color || getSensorColor(sensorType);
    const sensorUnit = unit || getSensorUnit(sensorType);
    const sensorName = getSensorName(sensorType);

    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value, name, props) => {
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -2 }}
        >
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">
                        {sensorName} Trend
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className={`h-[${CHART_CONFIG.defaultHeight}px]`}>
                        <AreaChart data={data} margin={CHART_CONFIG.margins}>
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
        </motion.div>
    );
}

export function MultiSensorChart({ data, title, colors }) {
    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value, name, props) => {
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -2 }}
        >
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className={`h-[${CHART_CONFIG.multiSensorHeight}px]`}>
                        <LineChart data={data} margin={CHART_CONFIG.margins}>
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
        </motion.div>
    );
}
