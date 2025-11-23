import { useState, useCallback } from 'react';

// Simple toast implementation
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback(({ title, description, variant = 'default', duration = 3000 }) => {
        const id = Date.now();
        const newToast = { id, title, description, variant };
        
        setToasts(prev => [...prev, newToast]);
        
        // Auto-dismiss after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
        
        // Log to console for now (can be enhanced with a proper toast UI component later)
        console.log(`[Toast ${variant}] ${title}: ${description}`);
    }, []);

    return { toast, toasts };
};
