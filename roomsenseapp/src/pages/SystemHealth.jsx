import React from 'react';
import { SystemHealthWidget } from '../components/ui/SystemHealthWidget';
import { useOutsideServer } from '../contexts/OutsideServerContext';
import { Card, CardContent } from '../components/ui/card';
import { Globe, RefreshCw, Radio } from 'lucide-react';

const SystemHealth = () => {
    const { isOutsideConnected, healthLoading, checkHealth, wsStatus } = useOutsideServer();

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
                <p className="text-muted-foreground">
                    Real-time operational status of all RoomSense devices and sensors.
                </p>
            </div>

            {/* Outside Server Status Overlay Card */}
            <Card className="border-border">
                <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isOutsideConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <Globe className={`h-6 w-6 ${isOutsideConnected ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Outside Server Global Gateway</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    Status: {healthLoading ? 'Checking...' : isOutsideConnected ? 'Online' : 'Offline'}
                                </span>
                                •
                                <span className="flex items-center gap-1">
                                    <Radio className="h-3 w-3" />
                                    WebSocket: {wsStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={checkHealth}
                        disabled={healthLoading}
                        className="p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${healthLoading ? 'animate-spin' : ''}`} />
                    </button>
                </CardContent>
            </Card>

            <SystemHealthWidget />
        </div >
    );
};

export default SystemHealth;
