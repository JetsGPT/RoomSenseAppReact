import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { outsideAuthAPI, createGatewayWebSocket } from '../services/outsideServerAPI';
import { useToast } from '../hooks/use-toast';

const OutsideServerContext = createContext(null);

/**
 * OutsideServerProvider
 *
 * Manages:
 * - Connection health to the OutsideServer
 * - User session (login / register / logout) via OutsideServer's Supabase auth
 * - WebSocket gateway connection state
 */
export const OutsideServerProvider = ({ children }) => {
    // Health
    const [isOutsideConnected, setIsOutsideConnected] = useState(false);
    const [healthLoading, setHealthLoading] = useState(true);

    // Auth
    const [outsideUser, setOutsideUser] = useState(() => {
        try {
            const stored = localStorage.getItem('outsideUser');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // WebSocket
    const [wsStatus, setWsStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
    const [wsMessages, setWsMessages] = useState([]);
    const wsRef = useRef(null);

    const { toast } = useToast();

    // ─── Health Check ───────────────────────────────────────────────
    const checkHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            await outsideAuthAPI.health();
            setIsOutsideConnected(true);
        } catch {
            setIsOutsideConnected(false);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 60000); // poll every 60s
        return () => clearInterval(interval);
    }, [checkHealth]);

    // ─── Auth ───────────────────────────────────────────────────────
    const outsideLogin = useCallback(async (email, password) => {
        try {
            const data = await outsideAuthAPI.login(email, password);
            if (data?.user) {
                setOutsideUser(data.user);
                localStorage.setItem('outsideUser', JSON.stringify(data.user));
            }
            return { success: true, data };
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Login failed';
            return { success: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
        }
    }, []);

    const outsideRegister = useCallback(async (username, email, password) => {
        try {
            await outsideAuthAPI.register(username, email, password);
            // Auto-login after registration
            return await outsideLogin(email, password);
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Registration failed';
            return { success: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
        }
    }, [outsideLogin]);

    const outsideLogout = useCallback(() => {
        setOutsideUser(null);
        localStorage.removeItem('outsideUser');
        disconnectGateway();
    }, []);

    // ─── WebSocket Gateway ──────────────────────────────────────────
    const connectGateway = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState <= 1) return; // already open/connecting

        setWsStatus('connecting');
        const ws = createGatewayWebSocket(
            // onMessage
            (data) => {
                setWsMessages((prev) => [...prev.slice(-99), data]); // keep last 100
            },
            // onOpen
            () => setWsStatus('connected'),
            // onClose
            () => setWsStatus('disconnected'),
            // onError
            () => {
                setWsStatus('disconnected');
                toast({
                    title: 'Gateway Error',
                    description: 'Failed to connect to OutsideServer WebSocket',
                    variant: 'destructive',
                });
            }
        );
        wsRef.current = ws;
    }, [toast]);

    const disconnectGateway = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsStatus('disconnected');
    }, []);

    const sendGatewayMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    // Clean up WS on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // ─── Context value ──────────────────────────────────────────────
    const value = React.useMemo(() => ({
        // Health
        isOutsideConnected,
        healthLoading,
        checkHealth,

        // Auth
        outsideUser,
        outsideLogin,
        outsideRegister,
        outsideLogout,
        isOutsideAuthenticated: !!outsideUser,

        // WebSocket
        wsStatus,
        wsMessages,
        connectGateway,
        disconnectGateway,
        sendGatewayMessage,
    }), [
        isOutsideConnected, healthLoading, checkHealth,
        outsideUser, outsideLogin, outsideRegister, outsideLogout,
        wsStatus, wsMessages, connectGateway, disconnectGateway, sendGatewayMessage,
    ]);

    return (
        <OutsideServerContext.Provider value={value}>
            {children}
        </OutsideServerContext.Provider>
    );
};

export const useOutsideServer = () => {
    const context = useContext(OutsideServerContext);
    if (!context) {
        throw new Error('useOutsideServer must be used within an OutsideServerProvider');
    }
    return context;
};
