import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Context for managing sidebar state across the application
 */
const SidebarContext = createContext();

/**
 * Hook to use sidebar context
 * @returns {Object} Sidebar context value
 */
export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

/**
 * Sidebar provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Array} props.sensorBoxes - Available sensor box IDs
 * @param {Array} props.connections - Full connection objects with device names
 */
export function SidebarProvider({ children, sensorBoxes = [], connections = [] }) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize activeView from URL or default to 'overview'
    const activeView = searchParams.get('view') || 'overview';

    const [isCollapsed, setIsCollapsed] = useState(false);

    /**
     * Handle view change
     * @param {string} viewId - New view identifier
     */
    const handleViewChange = useCallback((viewId) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('view', viewId);
            return newParams;
        });
    }, [setSearchParams]);

    /**
     * Toggle sidebar collapsed state
     */
    const toggleCollapsed = useCallback(() => {
        setIsCollapsed(prev => !prev);
    }, []);

    /**
     * Get current view information
     * @returns {Object} Current view info
     */
    const getCurrentView = useCallback(() => {
        if (activeView === 'overview') {
            return { type: 'overview', id: 'overview' };
        } else if (activeView.startsWith('box-')) {
            const boxId = activeView.replace('box-', '');
            return { type: 'box', id: boxId };
        } else if (activeView === 'analytics') {
            return { type: 'analytics', id: 'analytics' };
        } else if (activeView === 'options') {
            return { type: 'options', id: 'options' };
        }
        return { type: 'unknown', id: activeView };
    }, [activeView]);

    const value = React.useMemo(() => ({
        activeView,
        setActiveView: handleViewChange,
        isCollapsed,
        toggleCollapsed,
        getCurrentView,
        sensorBoxes,
        connections
    }), [activeView, handleViewChange, isCollapsed, toggleCollapsed, getCurrentView, sensorBoxes, connections]);


    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}
