import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import {
    Home, Box, Settings, Calendar, GitCompareArrows, Bell, Activity,
    Map, CloudSun, ChevronDown, ChevronRight, LayoutDashboard,
    Thermometer
} from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import { cn } from '../../lib/utils';
import { getConnectionBoxId, getConnectionDisplayName } from '../../lib/connectionIdentity';


/**
 * Global sidebar navigation component
 * Shows on all authenticated pages (hidden on login, kiosk, unauthorized)
 */
export function AppSidebar() {
    const {
        activeView, setActiveView,
        sensorBoxes, connections,
        isCollapsed, expandedGroups, toggleGroup
    } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();

    // Build sensor children from connections
    const sensorChildren = [
        { id: 'overview', label: 'Overview', icon: Home },
        ...connections.map((connection, index) => {
            const boxId = getConnectionBoxId(connection) || sensorBoxes[index];
            if (!boxId) {
                return null;
            }

            const displayName = getConnectionDisplayName(connection, boxId);
            return {
                id: `box-${boxId}`,
                label: displayName,
                icon: Box,
            };
        }).filter(Boolean),
    ];

    // Build analytics children
    const analyticsChildren = [
        { id: 'heatmap', label: 'Heatmap', icon: Calendar },
        { id: 'correlation', label: 'Correlation', icon: GitCompareArrows },
    ];

    // Navigation items
    const navItems = [
        {
            type: 'link',
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            href: '/dashboard',
        },
        {
            type: 'group',
            id: 'sensors',
            label: 'Sensors',
            icon: Thermometer,
            children: sensorChildren,
        },
        {
            type: 'link',
            id: 'box-management',
            label: 'Box Management',
            icon: Box,
            href: '/boxes',
        },
        {
            type: 'link',
            id: 'floor-plan',
            label: 'Floor Plan',
            icon: Map,
            href: '/floor-plan',
        },
        {
            type: 'group',
            id: 'analytics',
            label: 'Analytics',
            icon: GitCompareArrows,
            children: analyticsChildren,
        },
        {
            type: 'link',
            id: 'weather',
            label: 'Weather',
            icon: CloudSun,
            href: '/weather',
        },
        { type: 'separator' },
        {
            type: 'link',
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            href: '/notifications',
        },
        {
            type: 'link',
            id: 'system-health',
            label: 'System Health',
            icon: Activity,
            href: '/system-health',
        },
    ];

    const handleItemClick = (item) => {
        if (item.type === 'link') {
            navigate(item.href);
        } else if (item.dashboardView) {
            // Navigate to dashboard with the view
            if (location.pathname === '/dashboard') {
                setActiveView(item.dashboardView);
            } else {
                navigate(`/dashboard?view=${item.dashboardView}`);
            }
        }
    };

    const handleChildClick = (childId) => {
        if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard')) {
            setActiveView(childId);
        } else {
            navigate(`/dashboard?view=${childId}`);
        }
    };

    const isLinkActive = (item) => {
        if (item.href) return location.pathname === item.href;
        return false;
    };

    const isChildActive = (childId) => {
        return location.pathname.startsWith('/dashboard') && activeView === childId;
    };

    const isGroupActive = (group) => {
        if (!group.children) return false;
        return group.children.some(child => isChildActive(child.id));
    };

    if (isCollapsed) {
        // Collapsed sidebar - icons only
        return (
            <div className="hidden lg:flex flex-col w-14 h-[calc(100vh-48px)] border-r border-border bg-card/50 sticky top-12">
                <nav className="flex-1 py-2 flex flex-col items-center gap-1">
                    {navItems.map((item) => {
                        if (item.type === 'separator') return <Separator key="sep" className="my-2 w-8" />;
                        const Icon = item.icon;
                        const active = item.type === 'link' ? isLinkActive(item) : isGroupActive(item);
                        return (
                            <Button
                                key={item.id}
                                variant={active ? "default" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-lg",
                                    active && "bg-primary text-primary-foreground shadow-sm"
                                )}
                                title={item.label}
                                onClick={() => {
                                    if (item.type === 'link') {
                                        handleItemClick(item);
                                    } else if (item.type === 'group' && item.children?.length > 0) {
                                        handleChildClick(item.children[0].id);
                                    }
                                }}
                            >
                                <Icon size={16} />
                            </Button>
                        );
                    })}
                </nav>
                <div className="py-2 flex flex-col items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        title="Settings"
                        onClick={() => handleChildClick('options')}
                    >
                        <Settings size={16} />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="hidden lg:flex flex-col w-56 h-[calc(100vh-48px)] border-r border-border bg-card/50 sticky top-12 overflow-hidden">
            {/* Scrollable nav content */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
                {navItems.map((item, index) => {
                    if (item.type === 'separator') {
                        return <Separator key="sep" className="my-2" />;
                    }

                    const Icon = item.icon;

                    // Regular link item
                    if (item.type === 'link') {
                        const active = isLinkActive(item);
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                            >
                                <Button
                                    variant={active ? "default" : "ghost"}
                                    className={cn(
                                        "w-full justify-start h-9 px-3 text-sm rounded-lg",
                                        active
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                    )}
                                    onClick={() => handleItemClick(item)}
                                >
                                    <Icon size={16} className="mr-2.5 flex-shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </Button>
                            </motion.div>
                        );
                    }

                    // Group item with children
                    if (item.type === 'group') {
                        const isExpanded = expandedGroups[item.id] ?? false;
                        const groupActive = isGroupActive(item);

                        return (
                            <div key={item.id}>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-between h-9 px-3 text-sm rounded-lg",
                                            groupActive
                                                ? "text-primary font-medium"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                        )}
                                        onClick={() => toggleGroup(item.id)}
                                    >
                                        <div className="flex items-center">
                                            <Icon size={16} className="mr-2.5 flex-shrink-0" />
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronDown size={14} className="opacity-50" />
                                        </motion.div>
                                    </Button>
                                </motion.div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="ml-4 pl-2 border-l border-border/50 space-y-0.5 py-0.5">
                                                {item.children.map((child) => {
                                                    const ChildIcon = child.icon;
                                                    const childActive = isChildActive(child.id);
                                                    return (
                                                        <Button
                                                            key={child.id}
                                                            variant={childActive ? "secondary" : "ghost"}
                                                            className={cn(
                                                                "w-full justify-start h-8 px-2.5 text-xs rounded-md",
                                                                childActive
                                                                    ? "bg-accent text-accent-foreground font-medium"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                                                            )}
                                                            onClick={() => handleChildClick(child.id)}
                                                        >
                                                            <ChildIcon size={14} className="mr-2 flex-shrink-0" />
                                                            <span className="truncate">{child.label}</span>
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }

                    return null;
                })}
            </nav>

            {/* Footer: Settings */}
            <div className="p-2 border-t border-border/50">
                <Button
                    variant={activeView === 'options' ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                        "w-full justify-start text-sm rounded-lg h-9",
                        activeView === 'options'
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    onClick={() => handleChildClick('options')}
                >
                    <Settings size={16} className="mr-2.5" />
                    Settings
                </Button>
            </div>
        </div>
    );
}
