import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export function SensorLineChart({ data, sensorType, color, unit }) {
    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value, name, props) => {
        return [`${value.toFixed(1)}${unit}`, sensorType];
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg font-medium capitalize">
                    {sensorType} Over Time
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                        <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatXAxis}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tick={{ fontSize: 10 }}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tick={{ fontSize: 10 }}
                        />
                        <Tooltip 
                            formatter={formatTooltip}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                color: 'hsl(var(--foreground))',
                                fontSize: '12px'
                            }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={color} 
                            strokeWidth={2}
                            dot={{ fill: color, strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function SensorAreaChart({ data, sensorType, color, unit }) {
    const formatXAxis = (tickItem) => {
        return new Date(tickItem).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatTooltip = (value, name, props) => {
        return [`${value.toFixed(1)}${unit}`, sensorType];
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg font-medium capitalize">
                    {sensorType} Trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                        <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatXAxis}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tick={{ fontSize: 10 }}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tick={{ fontSize: 10 }}
                        />
                        <Tooltip 
                            formatter={formatTooltip}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                color: 'hsl(var(--foreground))',
                                fontSize: '12px'
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={color} 
                            fill={color}
                            fillOpacity={0.2}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
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
        const unit = getUnitForSensorType(name);
        return [`${value.toFixed(1)}${unit}`, name];
    };

    const getUnitForSensorType = (sensorType) => {
        switch (sensorType) {
            case 'temperature': return '°C';
            case 'humidity': return '%';
            case 'pressure': return ' hPa';
            case 'light': return ' lux';
            default: return '';
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg font-medium">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                        <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatXAxis}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tick={{ fontSize: 10 }}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tick={{ fontSize: 10 }}
                        />
                        <Tooltip 
                            formatter={formatTooltip}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                color: 'hsl(var(--foreground))',
                                fontSize: '12px'
                            }}
                        />
                        {Object.entries(colors).map(([sensorType, color]) => (
                            <Line 
                                key={sensorType}
                                type="monotone" 
                                dataKey={sensorType} 
                                stroke={color} 
                                strokeWidth={2}
                                dot={{ fill: color, strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
