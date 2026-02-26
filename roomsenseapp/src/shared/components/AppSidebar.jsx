import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Card } from '../../components/ui/card';
import { Home, Box, Settings, Calendar, GitCompareArrows, Bell, Activity } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';


/**
 * Single responsive sidebar component
 * Uses Card for desktop
 */
export function AppSidebar() {
    const { activeView, setActiveView, sensorBoxes, connections } = useSidebar();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Dashboard views only
    const sidebarItems = [
        {
            id: 'overview',
            label: 'Overview',
            icon: Home,
            description: 'All sensor boxes at a glance'
        },
        ...sensorBoxes.map((boxId, index) => {
            // Find the connection for this box to get the display name
            const connection = connections[index];
            const displayName = connection?.name || boxId;
            const technicalId = connection?.original_name;

            return {
                id: `box-${boxId}`,
                label: displayName,
                icon: Box,
                description: technicalId ? `ID: ${technicalId}` : `Detailed view for ${displayName}`
            };
        }),
        {
            id: 'heatmap',
            label: 'Heatmap',
            icon: Calendar,
            description: 'Sensor history view'
        },
        {
            id: 'correlation',
            label: 'Correlation',
            icon: GitCompareArrows,
            description: 'Compare sensor metrics'
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            description: 'Alerts & automations'
        },
        {
            id: 'system-health',
            label: 'System Health',
            icon: Activity,
            description: 'Device status monitor'
        }
    ];

    const handleItemClick = (itemId) => {
        if (itemId === 'notifications') {
            navigate('/notifications');
        } else if (itemId === 'system-health') {
            navigate('/system-health');
        } else if (!location.pathname.startsWith('/dashboard')) {
            navigate(`/dashboard?view=${itemId}`);
        } else {
            setActiveView(itemId);
        }
        setIsMobileOpen(false); // Close mobile sidebar after selection
    };

    const renderSidebarContent = () => (
        <>
            <nav className="flex-1 p-4 space-y-2">
                {sidebarItems.map((item, index) => {
                    const Icon = item.icon;
                    // Check pathname for top-level routes, otherwise use activeView query param
                    const isRouteActive = (item.id === 'notifications' && location.pathname === '/notifications') ||
                        (item.id === 'system-health' && location.pathname === '/system-health');
                    const isViewActive = activeView === item.id && location.pathname.startsWith('/dashboard');

                    const isActive = isRouteActive || isViewActive;

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                duration: 0.3,
                                delay: index * 0.1,
                                ease: "easeOut"
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                variant={isActive ? "default" : "ghost"}
                                className={`w-full justify-start h-auto p-4 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-lg'
                                    : 'hover:bg-accent/50 hover:text-accent-foreground'
                                    }`}
                                onClick={() => handleItemClick(item.id)}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <Icon size={18} className="flex-shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-sm">{item.label}</div>
                                        <div className="text-xs opacity-80 truncate">{item.description}</div>
                                    </div>
                                </div>
                            </Button>
                        </motion.div>
                    );
                })}</nav>

            <Separator />

            <motion.div
                className="p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
            >
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        variant={activeView === 'options' ? "default" : "ghost"}
                        size="sm"
                        className={`w-full justify-start text-sm rounded-xl transition-all duration-200 ${activeView === 'options'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'hover:bg-accent/50 hover:text-accent-foreground'
                            }`}
                        onClick={() => handleItemClick('options')}
                    >
                        <Settings size={16} className="mr-2" />
                        Settings
                    </Button>
                </motion.div>
            </motion.div>
        </>
    );

    return (
        <>
            {/* Mobile sidebar hidden - using top navigation menu instead */}

            {/* Desktop Sidebar */}
            <Card className="hidden md:flex flex-col w-64 h-screen border-r border-border bg-card shadow-lg z-40 rounded-l-none">
                <div className="p-6 border-b border-border">
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                        RoomSense
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Sensor Dashboard
                    </p>
                </div>
                {renderSidebarContent()}
            </Card>
        </>
    );
}