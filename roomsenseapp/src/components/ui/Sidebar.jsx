import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { Home, Box, BarChart3, Settings } from 'lucide-react';

export function Sidebar({ activeView, onViewChange, sensorBoxes }) {
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
        })),
        {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart3,
            description: 'Advanced data analysis'
        }
    ];

    return (
        <div className="w-full max-w-sm sm:w-64 bg-card border-r border-border h-full flex flex-col sm:border-r rounded-lg sm:rounded-none shadow-lg sm:shadow-none">
            {/* Header */}
            

            {/* Navigation */}
            <nav className="flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2">
                {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    
                    return (
                        <Button
                            key={item.id}
                            variant={isActive ? "default" : "ghost"}
                            className={`w-full justify-start h-auto p-2 sm:p-3 ${
                                isActive 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => onViewChange(item.id)}
                        >
                            <div className="flex items-center gap-2 sm:gap-3 w-full">
                                <Icon size={16} className="flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                                <div className="flex-1 text-left min-w-0">
                                    <div className="font-medium text-sm sm:text-base truncate">{item.label}</div>
                                    <div className="text-xs opacity-80 hidden sm:block truncate">{item.description}</div>
                                </div>
                            </div>
                        </Button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-2 sm:p-4 border-t border-border">
                <Button 
                    variant={activeView === 'options' ? "default" : "ghost"} 
                    size="sm" 
                    className={`w-full justify-start text-xs sm:text-sm ${
                        activeView === 'options' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                    onClick={() => onViewChange('options')}
                >
                    <Settings size={14} className="mr-1 sm:mr-2 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Button>
            </div>
        </div>
    );
}
