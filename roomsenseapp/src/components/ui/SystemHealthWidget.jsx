import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { sensorsAPI } from '../../services/sensorsAPI';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    RefreshCw,
    ServerCrash,
    Wifi,
    WifiOff,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { getSensorName, getSensorIcon } from '../../config/sensorConfig';

const StatusBadge = ({ status, className }) => {
    const config = {
        online: { color: 'bg-green-500/15 text-green-700 border-green-200', icon: CheckCircle, label: 'Online' },
        stale: { color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200', icon: Clock, label: 'Stale' },
        offline: { color: 'bg-red-500/15 text-red-700 border-red-200', icon: WifiOff, label: 'Offline' },
        unknown: { color: 'bg-gray-500/15 text-gray-700 border-gray-200', icon: AlertTriangle, label: 'Unknown' },
    }[status] || { color: 'bg-gray-500/15 text-gray-500 border-gray-200', icon: AlertTriangle, label: 'Unknown' };

    const Icon = config.icon;

    return (
        <div className={cn("flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", config.color, className)}>
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
        </div>
    );
};

const DeviceHealthCard = ({ device }) => {
    const [expanded, setExpanded] = useState(false);

    // Calculate last seen string
    const lastSeenText = device.last_seen
        ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })
        : 'Never';

    // Status color for the main border/indicator
    const statusColor = {
        online: 'bg-green-500',
        stale: 'bg-yellow-500',
        offline: 'bg-red-500',
    }[device.status] || 'bg-gray-400';

    return (
        <Card className="overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full shadow-sm", statusColor)} />
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                {device.display_name}
                            </CardTitle>
                            <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                                <Activity className="w-3 h-3" />
                                {device.box_id}
                            </CardDescription>
                        </div>
                    </div>
                    <StatusBadge status={device.status} />
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Last seen {lastSeenText}
                    </span>
                </div>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-2 pt-2 border-t mt-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sensor Status</p>
                                {device.sensors && device.sensors.length > 0 ? (
                                    device.sensors.map((sensor) => {
                                        const SensorIcon = getSensorIcon([sensor.type]); // Expect array usually
                                        const sensorLastSeen = sensor.last_seen
                                            ? formatDistanceToNow(new Date(sensor.last_seen), { addSuffix: true })
                                            : 'Never';

                                        return (
                                            <div key={sensor.type} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                                                <div className="flex items-center gap-2">
                                                    {/* We could use generic icon if getSensorIcon fails */}
                                                    <span className="capitalize font-medium">{getSensorName(sensor.type)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground">{sensorLastSeen}</span>
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        sensor.status === 'online' ? 'bg-green-500' : 'bg-red-500' // Simple binary for sensors for now
                                                    )} title={sensor.status} />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-2 text-sm text-muted-foreground italic">
                                        No sensor data found
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? (
                        <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                        <>View Sensors ({device.sensors?.length || 0}) <ChevronDown className="w-3 h-3 ml-1" /></>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

export const SystemHealthWidget = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await sensorsAPI.getSystemHealth();
            setDevices(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error("Failed to fetch system health:", err);
            setError("Failed to load system health data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        fetchData();
    };

    // Calculate aggregated stats
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const staleDevices = devices.filter(d => d.status === 'stale').length;
    const offlineDevices = devices.filter(d => d.status === 'offline').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
                    <p className="text-muted-foreground">
                        Monitor the status of your {totalDevices} active sensor devices.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline-block">
                        Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold">{totalDevices}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Devices</span>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-green-600">{onlineDevices}</span>
                        <span className="text-xs text-green-700 uppercase tracking-wider mt-1">Online</span>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50/50">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-yellow-600">{staleDevices}</span>
                        <span className="text-xs text-yellow-700 uppercase tracking-wider mt-1">Stale</span>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-red-600">{offlineDevices}</span>
                        <span className="text-xs text-red-700 uppercase tracking-wider mt-1">Offline</span>
                    </CardContent>
                </Card>
            </div>

            {/* Device Grid */}
            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
                    <ServerCrash className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <h3 className="font-semibold">Failed to load health data</h3>
                    <p className="text-sm opacity-80">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4 border-red-200 hover:bg-red-100">
                        Try Again
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {devices.map(device => (
                        <DeviceHealthCard key={device.address} device={device} />
                    ))}
                    {devices.length === 0 && !loading && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            No active devices found in the system.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
