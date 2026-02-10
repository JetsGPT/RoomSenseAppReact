import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sensorsAPI } from '../services/sensorsAPI';
import { CalendarHeatmap } from '../components/ui/CalendarHeatmap';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { getSensorConfig } from '../config/sensorConfig';
import { StaggeredContainer, StaggeredItem } from '../components/ui/PageTransition';

import { useConnections } from '../contexts/ConnectionsContext';

const HeatmapView = () => {
    const { activeConnections } = useConnections();
    const [loading, setLoading] = useState(true);
    const [heatmapData, setHeatmapData] = useState([]);

    // Selectors state
    // Derived from activeConnections
    const sensorBoxes = React.useMemo(() =>
        activeConnections.map(conn => conn.name || conn.address || conn.original_name),
        [activeConnections]);

    const [sensorTypes, setSensorTypes] = useState([]);

    // Selection state
    const [selectedBox, setSelectedBox] = useState('');
    const [selectedType, setSelectedType] = useState(''); // Default empty, set after types load
    const [aggregation, setAggregation] = useState('mean');

    // Initial load of types and setting default box
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await sensorsAPI.getSensorTypes();
                setSensorTypes(types || []);

                // Set default type if not set
                if (!selectedType && types && types.length > 0) {
                    if (types.includes('temperature')) setSelectedType('temperature');
                    else setSelectedType(types[0]);
                }
            } catch (err) {
                console.error("Failed to load sensor types", err);
                setSensorTypes(['temperature', 'humidity', 'co2']);
                if (!selectedType) setSelectedType('temperature');
            }
        };

        fetchTypes();

        // Set default box if available and not set
        if (!selectedBox && sensorBoxes.length > 0) {
            setSelectedBox(sensorBoxes[0]);
        } else if (selectedBox && !sensorBoxes.includes(selectedBox) && sensorBoxes.length > 0) {
            // If selected box is no longer in list, reset to first
            setSelectedBox(sensorBoxes[0]);
        }
    }, [sensorBoxes, selectedBox, selectedType]);

    // Fetch heatmap data when selection changes
    useEffect(() => {
        if (!selectedBox || !selectedType) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await sensorsAPI.getAggregatedData(selectedBox, selectedType, {
                    aggregation: aggregation
                });
                setHeatmapData(data);
            } catch (err) {
                console.error("Failed to load heatmap data", err);
                setHeatmapData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBox, selectedType, aggregation]);

    // Derived configs
    const sensorConfig = getSensorConfig(selectedType);

    return (
        <StaggeredContainer className="space-y-6">
            <StaggeredItem>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sensor Heatmap</h1>
                        <p className="text-muted-foreground">
                            Visualize daily patterns and reliability over the past year.
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-2">
                        <Select value={selectedBox} onValueChange={setSelectedBox}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Sensor Box" />
                            </SelectTrigger>
                            <SelectContent>
                                {sensorBoxes.map(box => (
                                    <SelectItem key={box} value={box}>
                                        {box.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Select Metric" />
                            </SelectTrigger>
                            <SelectContent>
                                {sensorTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={aggregation} onValueChange={setAggregation}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Aggregation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mean">Average</SelectItem>
                                <SelectItem value="max">Maximum</SelectItem>
                                <SelectItem value="min">Minimum</SelectItem>
                                <SelectItem value="count">Data Points</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </StaggeredItem>

            <StaggeredItem>
                <Card className="overflow-hidden border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <sensorConfig.icon className="w-5 h-5" style={{ color: sensorConfig.color }} />
                            {sensorConfig.name} ({aggregation})
                        </CardTitle>
                        <CardDescription>
                            Daily {aggregation} values for {selectedBox.replace(/_/g, ' ')}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CalendarHeatmap
                            data={heatmapData}
                            loading={loading}
                            color={sensorConfig.color}
                            unit={sensorConfig.unit}
                        />
                    </CardContent>
                </Card>
            </StaggeredItem>

            {/* Quick Stats or Insights could go here */}
            <StaggeredItem>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-base">Days with Data</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{heatmapData.length}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-base">Average Value</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {heatmapData.length > 0
                                    ? (heatmapData.reduce((acc, curr) => acc + curr.value, 0) / heatmapData.length).toFixed(1)
                                    : '-'
                                } {sensorConfig.unit}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-base">Data Coverage</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {Math.round((heatmapData.length / 365) * 100)}%
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </StaggeredItem>

        </StaggeredContainer>
    );
};

export default HeatmapView;
