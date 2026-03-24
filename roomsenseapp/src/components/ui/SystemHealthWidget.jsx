import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Button } from './button';
import { sensorsAPI } from '../../services/sensorsAPI';
import { bleAPI, systemAPI } from '../../services/api';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Package,
    Power,
    RefreshCw,
    ServerCrash,
    WifiOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { getSensorName } from '../../config/sensorConfig';
import { FRONTEND_VERSION } from '../../config/appVersion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const normalizeConnectionDevice = (connection) => ({
    address: connection.address,
    box_id: connection.original_name || connection.box_name || connection.name || connection.address,
    display_name: connection.name || connection.display_name || connection.original_name || connection.address,
    last_seen: connection.last_seen || null,
    status: 'online',
    sensors: [],
    connectionOnly: true,
});

const isNotModifiedError = (error) => error?.response?.status === 304;

const mergeStatus = (healthStatus, hasConnection) => {
    if (!hasConnection) {
        return healthStatus || 'unknown';
    }

    if (!healthStatus || healthStatus === 'offline' || healthStatus === 'unknown') {
        return 'online';
    }

    return healthStatus;
};

const mergeDevices = (healthDevices = [], connections = []) => {
    const devicesByAddress = new Map();

    healthDevices.forEach((device) => {
        const key = device.address?.toUpperCase();
        if (!key) return;

        devicesByAddress.set(key, {
            ...device,
            sensors: Array.isArray(device.sensors) ? device.sensors : [],
            connectionOnly: false,
        });
    });

    connections.forEach((connection) => {
        const key = connection.address?.toUpperCase();
        if (!key) return;

        const existing = devicesByAddress.get(key);
        if (!existing) {
            devicesByAddress.set(key, normalizeConnectionDevice(connection));
            return;
        }

        devicesByAddress.set(key, {
            ...existing,
            box_id: existing.box_id || connection.original_name || connection.box_name || connection.name || connection.address,
            display_name: connection.name || existing.display_name || connection.display_name || connection.original_name || connection.address,
            last_seen: existing.last_seen || connection.last_seen || null,
            status: mergeStatus(existing.status, true),
            sensors: Array.isArray(existing.sensors) ? existing.sensors : [],
            connectionOnly: !existing.sensors || existing.sensors.length === 0,
        });
    });

    const statusOrder = { online: 0, stale: 1, offline: 2, unknown: 3 };

    return Array.from(devicesByAddress.values()).sort((a, b) => {
        const statusDelta = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDelta !== 0) return statusDelta;
        return (a.display_name || a.box_id || a.address || '').localeCompare(b.display_name || b.box_id || b.address || '');
    });
};

const StatusBadge = ({ status, className }) => {
    const config = {
        online: { color: 'bg-green-500/15 text-green-700 border-green-200', icon: CheckCircle, label: 'Online' },
        stale: { color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200', icon: Clock, label: 'Stale' },
        offline: { color: 'bg-red-500/15 text-red-700 border-red-200', icon: WifiOff, label: 'Offline' },
        unknown: { color: 'bg-gray-500/15 text-gray-700 border-gray-200', icon: AlertTriangle, label: 'Unknown' },
    }[status] || { color: 'bg-gray-500/15 text-gray-500 border-gray-200', icon: AlertTriangle, label: 'Unknown' };

    const Icon = config.icon;

    return (
        <div className={cn('flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', config.color, className)}>
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
        </div>
    );
};

const InfoRow = ({ label, value }) => (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-xs">{value}</span>
    </div>
);

const DeviceHealthCard = ({ device }) => {
    const [expanded, setExpanded] = useState(false);

    const lastSeenText = device.last_seen
        ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })
        : 'Never';

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
                        <div className={cn('w-3 h-3 rounded-full shadow-sm', statusColor)} />
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

                {device.connectionOnly && (
                    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
                        Connected via BLE. Waiting for sensor readings to appear.
                    </div>
                )}

                <AnimatePresence>
                    {expanded && (
                        <Motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-2 pt-2 border-t mt-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sensor Status</p>
                                {device.sensors && device.sensors.length > 0 ? (
                                    device.sensors.map((sensor) => {
                                        const sensorLastSeen = sensor.last_seen
                                            ? formatDistanceToNow(new Date(sensor.last_seen), { addSuffix: true })
                                            : 'Never';

                                        return (
                                            <div key={sensor.type} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                                                <div className="flex items-center gap-2">
                                                    <span className="capitalize font-medium">{getSensorName(sensor.type)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground">{sensorLastSeen}</span>
                                                    <div
                                                        className={cn(
                                                            'w-2 h-2 rounded-full',
                                                            sensor.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                                                        )}
                                                        title={sensor.status}
                                                    />
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
                        </Motion.div>
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
    const { user } = useAuth();
    const { toast } = useToast();

    const [healthDevices, setHealthDevices] = useState([]);
    const [connections, setConnections] = useState([]);
    const [systemInfo, setSystemInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [rebooting, setRebooting] = useState(false);

    const devices = useMemo(() => mergeDevices(healthDevices, connections), [healthDevices, connections]);
    const isAdmin = user?.role === 'admin';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            let nextWarning = null;

            const [connectionsResult, healthResult, systemResult] = await Promise.allSettled([
                bleAPI.getActiveConnections(),
                sensorsAPI.getSystemHealth(),
                systemAPI.getInfo(),
            ]);

            const connectionsNotModified = connectionsResult.status === 'rejected' && isNotModifiedError(connectionsResult.reason);
            const healthNotModified = healthResult.status === 'rejected' && isNotModifiedError(healthResult.reason);
            const systemNotModified = systemResult.status === 'rejected' && isNotModifiedError(systemResult.reason);

            const nextConnections = connectionsResult.status === 'fulfilled' && Array.isArray(connectionsResult.value)
                ? connectionsResult.value
                : (connectionsNotModified ? connections : []);
            const nextHealthDevices = healthResult.status === 'fulfilled' && Array.isArray(healthResult.value)
                ? healthResult.value
                : (healthNotModified ? healthDevices : []);
            const nextSystemInfo = systemResult.status === 'fulfilled'
                ? systemResult.value
                : (systemNotModified ? systemInfo : null);

            setConnections(nextConnections);
            setHealthDevices(nextHealthDevices);
            setSystemInfo(nextSystemInfo);
            setLastUpdated(new Date());

            if (connectionsResult.status === 'rejected' && !connectionsNotModified) {
                console.error('Failed to fetch active connections for system health:', connectionsResult.reason);
            }

            if (healthResult.status === 'rejected' && !healthNotModified) {
                console.error('Failed to fetch system health:', healthResult.reason);
                if (nextConnections.length > 0) {
                    nextWarning = 'Sensor health details are temporarily unavailable. Showing connected boxes only.';
                } else {
                    setError('Failed to load system health data');
                }
            }

            if (systemResult.status === 'rejected' && !systemNotModified) {
                console.error('Failed to fetch system info:', systemResult.reason);
                if (!nextConnections.length && healthResult.status === 'rejected') {
                    setError('Failed to load system status data');
                } else if (!nextWarning) {
                    nextWarning = 'System version details are temporarily unavailable.';
                }
            }

            setWarning(nextWarning);
        } catch (err) {
            console.error('Failed to fetch system health:', err);
            setError('Failed to load system health data');
        } finally {
            setLoading(false);
        }
    }, [connections, healthDevices, systemInfo]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = () => {
        fetchData();
    };

    const handleReboot = useCallback(async () => {
        if (!systemInfo?.rebootConfigured || rebooting) {
            return;
        }

        const confirmed = window.confirm('Reboot the RoomSense device now?');
        if (!confirmed) {
            return;
        }

        try {
            setRebooting(true);
            const result = await systemAPI.reboot();
            toast({
                title: 'Reboot queued',
                description: result?.message || 'The reboot command was launched successfully.',
            });
        } catch (err) {
            const description = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to trigger reboot.';
            toast({
                title: 'Reboot failed',
                description,
                variant: 'destructive',
            });
        } finally {
            setRebooting(false);
        }
    }, [rebooting, systemInfo, toast]);

    const totalDevices = devices.length;
    const onlineDevices = devices.filter((device) => device.status === 'online').length;
    const staleDevices = devices.filter((device) => device.status === 'stale').length;
    const offlineDevices = devices.filter((device) => device.status === 'offline').length;

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
                        <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {warning && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    {warning}
                </div>
            )}

            <div className={cn('grid grid-cols-1 gap-4', isAdmin && 'lg:grid-cols-2')}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Versions
                        </CardTitle>
                        <CardDescription>
                            Current frontend and backend versions served by this device.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <InfoRow label="Frontend" value={FRONTEND_VERSION} />
                        <InfoRow label="Backend" value={systemInfo?.backendVersion || 'Unavailable'} />
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Frontend build on backend</span>
                                <span className={cn(
                                    'text-xs font-medium',
                                    systemInfo?.frontendBuildPresent === false
                                        ? 'text-amber-600'
                                        : systemInfo?.frontendBuildPresent === true
                                            ? 'text-emerald-600'
                                            : 'text-muted-foreground'
                                )}>
                                    {systemInfo?.frontendBuildPresent === false
                                        ? 'Missing'
                                        : systemInfo?.frontendBuildPresent === true
                                            ? 'Present'
                                            : 'Unknown'}
                                </span>
                            </div>
                        </div>
                        {systemInfo?.frontendBuildPresent === false && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                The backend static directory does not currently contain a built frontend bundle.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {isAdmin && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Power className="w-4 h-4" />
                                System Control
                            </CardTitle>
                            <CardDescription>
                                Reboot is available when the backend can reach the Raspberry Pi host helper or a configured reboot command hook.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                {systemInfo?.rebootConfigured
                                    ? 'Reboot is configured and will execute the Raspberry Pi host control helper or configured backend command.'
                                    : 'Reboot is disabled until the Raspberry Pi host helper is installed or SYSTEM_REBOOT_COMMAND is configured on the backend.'}
                            </div>
                            <Button
                                onClick={handleReboot}
                                disabled={!systemInfo?.rebootConfigured || rebooting}
                                className="w-full"
                            >
                                {rebooting ? <LoaderIcon /> : <Power className="w-4 h-4 mr-2" />}
                                {systemInfo?.rebootLabel || 'Reboot device'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

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
                    {devices.map((device) => (
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

const LoaderIcon = () => <RefreshCw className="w-4 h-4 mr-2 animate-spin" />;
