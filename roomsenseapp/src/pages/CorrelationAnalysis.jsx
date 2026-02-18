import React, { useState, useMemo } from 'react';
import { useConnections } from '../contexts/ConnectionsContext';
import { useSensorData } from '../hooks/useSensorData';
import {
    calculateHeatIndex,
    calculateDewPoint,
    calculateCorrelation,
    pairSensorData
} from '../lib/correlationUtils';
import MetricSelector from '../components/ui/MetricSelector';
import CorrelationChart from '../components/ui/CorrelationChart';
import DerivedValueCard from '../components/ui/DerivedValueCard';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, GitCompareArrows } from 'lucide-react';

const CorrelationAnalysis = () => {
    const { activeConnections } = useConnections();

    // State
    const [selectedBoxId, setSelectedBoxId] = useState(activeConnections[0]?.sensor_box || '');
    const [xMetric, setXMetric] = useState('temperature');
    const [yMetric, setYMetric] = useState('humidity');
    const [timeRange, setTimeRange] = useState('24h');

    // Fetch data for the selected box
    const { data, loading, error } = useSensorData({
        sensor_box: selectedBoxId,
        timeRange: `-${timeRange}`, // Hook expects "-24h" format for some reason, or handle in lib
        limit: 2000 // Fetch enough points
    });

    // Process data
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return { paired: [], correlation: null, stats: null };

        // Filter by metric
        const xData = data.filter(d => d.sensor_type === xMetric).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const yData = data.filter(d => d.sensor_type === yMetric).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Pair data
        const paired = pairSensorData(xData, yData);

        // Calculate correlation
        const correlation = calculateCorrelation(paired);

        // Calculate derived stats (Heat Index / Dew Point) if applicable
        let heatIndex = null;
        let dewPoint = null;

        if (
            (xMetric === 'temperature' && yMetric === 'humidity') ||
            (xMetric === 'humidity' && yMetric === 'temperature')
        ) {
            // Get latest reading
            const last = paired[paired.length - 1];
            if (last) {
                const t = xMetric === 'temperature' ? last.x : last.y;
                const h = xMetric === 'humidity' ? last.x : last.y;

                heatIndex = calculateHeatIndex(t, h);
                dewPoint = calculateDewPoint(t, h);
            }
        }

        return { paired, correlation, heatIndex, dewPoint };
    }, [data, xMetric, yMetric]);

    // Available sensor types in the fetched data
    const availableSensors = useMemo(() => {
        if (!data) return ['temperature', 'humidity'];
        const types = new Set(data.map(d => d.sensor_type));
        return Array.from(types);
    }, [data]);

    if (!activeConnections.length) {
        return <div className="p-8 text-center text-muted-foreground">No active sensor connections found.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Correlation Analysis</h1>
                    <p className="text-muted-foreground">Analyze relationships between sensor metrics.</p>
                </div>

                {/* Box Selector */}
                <Select value={selectedBoxId} onValueChange={setSelectedBoxId}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Sensor Box" />
                    </SelectTrigger>
                    <SelectContent>
                        {activeConnections.map(conn => (
                            <SelectItem key={conn.sensor_box} value={conn.sensor_box}>
                                {conn.name || conn.sensor_box}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Controls & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">X-Axis Metric</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MetricSelector
                            value={xMetric}
                            onChange={setXMetric}
                            options={availableSensors}
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
                            options={availableSensors}
                            label=""
                        />
                    </CardContent>
                </Card>

                {/* Derived Values or Correlation */}
                <DerivedValueCard
                    type="correlation"
                    label="Correlation (r)"
                    value={processedData.correlation}
                    description={
                        processedData.correlation > 0.7 ? "Strong positive correlation" :
                            processedData.correlation < -0.7 ? "Strong negative correlation" :
                                Math.abs(processedData.correlation) < 0.3 ? "Weak or no correlation" : "Moderate correlation"
                    }
                />

                {processedData.heatIndex !== null && (
                    <DerivedValueCard
                        type="heatIndex"
                        label="Av. Heat Index"
                        value={processedData.heatIndex}
                        unit="°C"
                        description="Feels-like temperature"
                    />
                )}
                {processedData.dewPoint !== null && (
                    <DerivedValueCard
                        type="dewPoint"
                        label="Dew Point"
                        value={processedData.dewPoint}
                        unit="°C"
                        description="Temperature where dew forms"
                    />
                )}
            </div>

            {/* Main Chart */}
            <div className="min-h-[400px]">
                {loading && !processedData.paired.length ? (
                    <div className="h-[400px] flex items-center justify-center border rounded-xl bg-card/50">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <CorrelationChart
                        data={processedData.paired}
                        xMetric={xMetric}
                        yMetric={yMetric}
                        initialRange={timeRange}
                        onRangeChange={setTimeRange}
                    />
                )}
            </div>
        </div>
    );
};

export default CorrelationAnalysis;
