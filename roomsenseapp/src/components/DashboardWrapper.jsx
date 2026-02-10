import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useConnections } from '../contexts/ConnectionsContext';
import { SidebarProvider } from '../shared/contexts/SidebarContext';
import { AppSidebar } from '../shared/components/AppSidebar';
import Navigation from './ui/Navigation';

export const DashboardWrapper = () => {
    const { activeConnections } = useConnections();
    const location = useLocation();

    // specific logic to extract sensor box IDs from connections
    // Assuming connection.name is like "RoomSense 101" or similar, 
    // OR we use connection.original_name as the ID, or parsing logic.
    // In AppSidebar it does: const connection = connections[index]; const displayName = connection?.name || boxId;
    // So we just need to pass the list of connections and list of IDs.

    // Let's assume activeConnections has the data we need.
    // We need to derive sensorBoxes list (list of IDs).
    // Based on AppSidebar.jsx: 
    // ...sensorBoxes.map((boxId, index) => { const connection = connections[index]; ... })
    // So sensorBoxes should correspond to connections.

    const sensorBoxes = useMemo(() => {
        return activeConnections.map(conn => {
            // Heuristic to get ID from connection
            // If connection has 'boxId' property, use it.
            // If not, maybe use part of the name or mac address?
            // For now, let's assume the connection object might have it, or we use a generated one.
            // Looking at AppSidebar again: "const technicalId = connection?.original_name;"

            // In typical setup, we might just map 1:1.
            // Let's just use the index or a unique ID from connection if available.
            return conn.id || conn.address || `box-${Math.random()}`;
        });
    }, [activeConnections]);

    const boxes = useMemo(() => activeConnections.map(c => c.original_name || c.name), [activeConnections]);

    // Only show sidebar on dashboard pages
    const showSidebar = location.pathname.startsWith('/dashboard');

    return (
        <SidebarProvider sensorBoxes={boxes} connections={activeConnections}>
            <div className="flex h-screen bg-background overflow-hidden">
                {showSidebar && <AppSidebar />}
                <main className="flex-1 flex flex-col overflow-hidden w-full">
                    <Navigation />
                    <div className="flex-1 overflow-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
};
