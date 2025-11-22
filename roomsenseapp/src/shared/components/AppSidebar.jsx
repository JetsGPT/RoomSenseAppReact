import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Card } from '../../components/ui/card';
import { Home, Box, BarChart3, Settings, Menu } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';

/**
 * Single responsive sidebar component
 * Uses Sheet for mobile, Card for desktop
 */
export function AppSidebar() {
    const { activeView, setActiveView, sensorBoxes } = useSidebar();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Dashboard views only
    const sidebarItems = [
        {
            id: 'overview',
            label: 'Overview',
            icon: Home,
            description: 'All sensor boxes at a glance'
        },
        ...sensorBoxes.map(boxId => ({
            id: `box-${boxId}`,
            label: `Box ${boxId}`,
            icon: Box,
            description: `Detailed view for ${boxId}`
        }))
    ];

    const handleItemClick = (itemId) => {
        setActiveView(itemId);
        setIsMobileOpen(false); // Close mobile sidebar after selection
    };

    const renderSidebarContent = () => (
        <>
            <nav className="flex-1 p-4 space-y-2">
                {sidebarItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;

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
                })}
            </nav>

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
            <Card className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 rounded-none border-r border-border bg-card shadow-lg z-40">
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