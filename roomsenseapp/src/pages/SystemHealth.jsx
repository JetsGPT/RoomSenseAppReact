import React from 'react';
import { SystemHealthWidget } from '../components/ui/SystemHealthWidget';

const SystemHealth = () => {
    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
                <p className="text-muted-foreground">
                    Real-time operational status of all RoomSense devices and sensors.
                </p>
            </div>

            <SystemHealthWidget />
        </div>
    );
};

export default SystemHealth;
