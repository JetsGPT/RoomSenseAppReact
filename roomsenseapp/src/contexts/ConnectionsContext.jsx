import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bleAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

import { useAuth } from './AuthContext';
import { DEV_MODE, DEV_CONNECTIONS } from '../config/devConfig';

const ConnectionsContext = createContext(null);

export const ConnectionsProvider = ({ children }) => {
    const { user } = useAuth();
    const [activeConnections, setActiveConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const lastRequestId = React.useRef(0);

    const fetchConnections = useCallback(async (silent = false) => {
        if (!user) {
            setLoading(false);
            return;
        }

        // DEV MODE: Use mock connections
        if (DEV_MODE) {
            console.log('[DEV MODE] Using mock connections');
            setActiveConnections(DEV_CONNECTIONS);
            setLoading(false);
            return;
        }

        const requestId = ++lastRequestId.current;
        if (!silent) setLoading(true);

        try {
            const connections = await bleAPI.getActiveConnections();

            // Validate that connections is an array
            if (!Array.isArray(connections)) {
                console.error('API returned non-array for active connections:', connections);
                throw new Error('Invalid API response format');
            }

            // Race condition check: if a newer request has started, ignore this result
            if (requestId !== lastRequestId.current) {
                return;
            }

            setActiveConnections(prev => {
                // Custom comparison to avoid JSON.stringify issues
                if (prev.length !== connections.length) return connections;

                const sortedPrev = [...prev].sort((a, b) => a.address.localeCompare(b.address));
                const sortedNew = [...connections].sort((a, b) => a.address.localeCompare(b.address));

                const isEqual = sortedPrev.every((p, i) =>
                    p.address === sortedNew[i].address &&
                    p.name === sortedNew[i].name &&
                    p.original_name === sortedNew[i].original_name
                );

                return isEqual ? prev : connections;
            });
        } catch (error) {
            // Only show error if this is still the latest request
            if (requestId === lastRequestId.current) {
                console.error('Failed to fetch active connections:', error);
                if (!silent) {
                    toast({
                        title: "Error",
                        description: "Failed to load active connections",
                        variant: "destructive",
                    });
                }
            }
        } finally {
            if (requestId === lastRequestId.current) {
                setLoading(false);
            }
        }
    }, [toast, user]);

    // Initial fetch
    useEffect(() => {
        if (user) {
            fetchConnections();
        } else {
            setActiveConnections([]);
            setLoading(false);
        }
    }, [fetchConnections, user]);

    // Poll for connections every 30 seconds to keep in sync
    const [isPollingPaused, setPollingPaused] = useState(false);

    useEffect(() => {
        if (!user || isPollingPaused) return;

        const interval = setInterval(() => {
            fetchConnections(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchConnections, user, isPollingPaused]);

    // Memoize context value to prevent unnecessary re-renders of consumers
    const contextValue = React.useMemo(() => ({
        activeConnections,
        loading,
        refreshConnections: fetchConnections,
        setPollingPaused
    }), [activeConnections, loading, fetchConnections, setPollingPaused]);

    return (
        <ConnectionsContext.Provider value={contextValue}>
            {children}
        </ConnectionsContext.Provider>
    );
};


export const useConnections = () => {
    const context = useContext(ConnectionsContext);
    if (!context) {
        throw new Error('useConnections must be used within a ConnectionsProvider');
    }
    return context;
};
