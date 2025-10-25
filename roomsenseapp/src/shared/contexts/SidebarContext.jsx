import React, { createContext, useContext, useState, useCallback } from 'react';

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
 * @param {Array} props.sensorBoxes - Available sensor boxes
 */
export function SidebarProvider({ children, sensorBoxes = [] }) {
    const [activeView, setActiveView] = useState('overview');
    const [isCollapsed, setIsCollapsed] = useState(false);

    /**
     * Handle view change
     * @param {string} viewId - New view identifier
     */
    const handleViewChange = useCallback((viewId) => {
        setActiveView(viewId);
    }, []);

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

    const value = {
        activeView,
        setActiveView: handleViewChange,
        isCollapsed,
        toggleCollapsed,
        getCurrentView,
        sensorBoxes
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}
