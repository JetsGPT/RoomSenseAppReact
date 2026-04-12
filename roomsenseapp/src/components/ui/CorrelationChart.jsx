import React, { useState, useEffect } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ZAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { getSensorName, getSensorUnit, getSensorColor } from '../../config/sensorConfig';
import { CHART_RANGE_OPTIONS, DEFAULT_CHART_RANGE } from '../../lib/timeRange';

const CorrelationChart = ({
    data,
    xMetric,
    yMetric,
    onRangeChange,
    initialRange = DEFAULT_CHART_RANGE,
    rangeOptions = CHART_RANGE_OPTIONS
}) => {
    const [selectedRange, setSelectedRange] = useState(initialRange);

    useEffect(() => {
        if (onRangeChange) {
            onRangeChange(selectedRange);
        }
    }, [selectedRange, onRangeChange]);

    const xName = getSensorName(xMetric);
    const xUnit = getSensorUnit(xMetric);
    const yName = getSensorName(yMetric);
    const yUnit = getSensorUnit(yMetric);
    const color = getSensorColor(xMetric) || "#8884d8";

    // Data Downsampling
    const displayData = React.useMemo(() => {
        if (!data || data.length <= 1000) return data;

        const step = Math.ceil(data.length / 1000);
        return data.filter((_, index) => index % step === 0);
    }, [data]);

    // Formatters
    const formatX = (value) => `${value.toFixed(1)}${xUnit}`;
    const formatY = (value) => `${value.toFixed(1)}${yUnit}`;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-popover border border-border p-2 rounded-md shadow-md text-sm">
                    <p className="font-medium text-popover-foreground mb-1">
                        {new Date(dataPoint.timestamp).toLocaleString()}
                    </p>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">
                            {xName}: <span className="font-medium text-foreground">{dataPoint.x.toFixed(2)}{xUnit}</span>
                        </span>
                        <span className="text-muted-foreground">
                            {yName}: <span className="font-medium text-foreground">{dataPoint.y.toFixed(2)}{yUnit}</span>
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg font-medium">
                        {xName} vs. {yName}
                    </CardTitle>
                    <div className="flex gap-1">
                        {rangeOptions.map((opt) => (
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
                <div className="h-[400px] w-full">
                    {data && data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name={xName}
                                    unit={xUnit}
                                    label={{ value: `${xName} (${xUnit})`, position: 'bottom', offset: 0 }}
                                    tick={{ fontSize: 12 }}
                                    domain={['auto', 'auto']}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name={yName}
                                    unit={yUnit}
                                    label={{ value: `${yName} (${yUnit})`, angle: -90, position: 'insideLeft' }}
                                    tick={{ fontSize: 12 }}
                                    domain={['auto', 'auto']}
                                />
                                <ZAxis range={[20, 20]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter
                                    name="Correlation"
                                    data={displayData}
                                    fill={color}
                                    shape="circle"
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No matching data points found for this range.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CorrelationChart;
