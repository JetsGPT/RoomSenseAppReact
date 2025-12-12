import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download as DownloadIcon, Calendar, Database, FileText, Loader2, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { StaggeredContainer, StaggeredItem } from '../components/ui/PageTransition';
import { useConnections } from '../contexts/ConnectionsContext';
import { sensorsAPI } from '../services/sensorsAPI';
import { useToast } from '../hooks/use-toast';

export default function Download() {
    const { activeConnections } = useConnections();
    const { toast } = useToast();
    
    // Form state
    const [selectedBox, setSelectedBox] = useState('all');
    const [selectedSensorType, setSelectedSensorType] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [limit, setLimit] = useState('10000');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // UI state
    const [isExporting, setIsExporting] = useState(false);
    
    // Available sensor types
    const sensorTypes = ['temperature', 'humidity', 'pressure', 'light'];
    
    // Set default dates (last 7 days)
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        
        setEndDate(end.toISOString().slice(0, 16));
        setStartDate(start.toISOString().slice(0, 16));
    }, []);
    
    const handleExport = async () => {
        setIsExporting(true);
        
        try {
            // Build filter parameters
            const filters = {};
            
            if (selectedBox !== 'all') {
                filters.sensor_box = selectedBox;
            }
            
            if (selectedSensorType !== 'all') {
                filters.sensor_type = selectedSensorType;
            }
            
            if (startDate) {
                filters.start_time = new Date(startDate).toISOString();
            }
            
            if (endDate) {
                filters.end_time = new Date(endDate).toISOString();
            }
            
            if (limit && parseInt(limit) > 0) {
                filters.limit = parseInt(limit);
            }
            
            if (sortOrder) {
                filters.sort = sortOrder;
            }
            
            // Call the export function
            await sensorsAPI.exportCSV(filters);
            
            toast({
                title: "Export Successful",
                description: "Your sensor data has been downloaded as a CSV file.",
                variant: "default",
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            toast({
                title: "Export Failed",
                description: error.message || "Failed to export sensor data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleQuickRange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        
        setEndDate(end.toISOString().slice(0, 16));
        setStartDate(start.toISOString().slice(0, 16));
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <StaggeredContainer>
                <StaggeredItem>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <DownloadIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Download Data</h1>
                                <p className="text-muted-foreground">
                                    Export your sensor data as CSV for external analysis
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </StaggeredItem>

                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Export Filters
                            </CardTitle>
                            <CardDescription>
                                Configure your data export parameters. All filters are optional.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Quick Range Buttons */}
                            <div>
                                <Label className="mb-2 block">Quick Date Range</Label>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickRange(1)}
                                        type="button"
                                    >
                                        Last 24 Hours
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickRange(7)}
                                        type="button"
                                    >
                                        Last 7 Days
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickRange(30)}
                                        type="button"
                                    >
                                        Last 30 Days
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickRange(90)}
                                        type="button"
                                    >
                                        Last 90 Days
                                    </Button>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startDate" className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Start Date
                                    </Label>
                                    <Input
                                        id="startDate"
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate" className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        End Date
                                    </Label>
                                    <Input
                                        id="endDate"
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Sensor Box Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="sensorBox" className="flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Sensor Box
                                </Label>
                                <select
                                    id="sensorBox"
                                    value={selectedBox}
                                    onChange={(e) => setSelectedBox(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="all">All Boxes</option>
                                    {activeConnections.map((conn) => (
                                        <option key={conn.address} value={conn.address}>
                                            {conn.name || conn.address}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sensor Type Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="sensorType" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Sensor Type
                                </Label>
                                <select
                                    id="sensorType"
                                    value={selectedSensorType}
                                    onChange={(e) => setSelectedSensorType(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="all">All Sensor Types</option>
                                    {sensorTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Advanced Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="limit">Max Records</Label>
                                    <Input
                                        id="limit"
                                        type="number"
                                        min="1"
                                        max="100000"
                                        value={limit}
                                        onChange={(e) => setLimit(e.target.value)}
                                        placeholder="10000"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Maximum: 100,000 records
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sortOrder">Sort Order</Label>
                                    <select
                                        id="sortOrder"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="desc">Newest First</option>
                                        <option value="asc">Oldest First</option>
                                    </select>
                                </div>
                            </div>

                            {/* Export Button */}
                            <div className="pt-4 border-t">
                                <Button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <DownloadIcon className="mr-2 h-4 w-4" />
                                            Export to CSV
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </StaggeredItem>

                <StaggeredItem>
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>CSV File Format</CardTitle>
                            <CardDescription>
                                The exported CSV file will contain the following columns
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2 pb-2 border-b font-medium">
                                    <span>Column Name</span>
                                    <span>Description</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">timestamp</code>
                                    <span className="text-muted-foreground">ISO timestamp of the reading</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">sensor_box</code>
                                    <span className="text-muted-foreground">Box ID (MAC address)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">sensor_type</code>
                                    <span className="text-muted-foreground">Type of sensor measurement</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">value</code>
                                    <span className="text-muted-foreground">Sensor reading value</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </StaggeredItem>
            </StaggeredContainer>
        </div>
    );
}
