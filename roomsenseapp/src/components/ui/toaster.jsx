import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Global toast state
let listeners = [];
let toastQueue = [];
let nextId = 0;

function emitChange() {
    for (const listener of listeners) {
        listener([...toastQueue]);
    }
}

export function toast({ title, description, variant = 'default', duration = 4000 }) {
    const id = nextId++;
    const newToast = { id, title, description, variant };
    toastQueue = [...toastQueue, newToast];
    emitChange();

    if (duration > 0) {
        setTimeout(() => {
            dismissToast(id);
        }, duration);
    }

    return id;
}

export function dismissToast(id) {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    emitChange();
}

function useToastStore() {
    const [toasts, setToasts] = useState(toastQueue);

    useEffect(() => {
        listeners.push(setToasts);
        return () => {
            listeners = listeners.filter((l) => l !== setToasts);
        };
    }, []);

    return toasts;
}

const variantStyles = {
    default: 'bg-card border-border text-foreground',
    success: 'bg-card border-green-500/50 text-foreground',
    destructive: 'bg-card border-destructive/50 text-foreground',
    info: 'bg-card border-primary/50 text-foreground',
};

const variantIcons = {
    default: null,
    success: CheckCircle2,
    destructive: AlertCircle,
    info: Info,
};

const iconColors = {
    default: '',
    success: 'text-green-500',
    destructive: 'text-destructive',
    info: 'text-primary',
};

export function Toaster() {
    const toasts = useToastStore();

    return createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((t) => {
                    const Icon = variantIcons[t.variant] || variantIcons.default;
                    return (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                'pointer-events-auto rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3',
                                variantStyles[t.variant] || variantStyles.default
                            )}
                        >
                            {Icon && (
                                <Icon
                                    className={cn(
                                        'h-5 w-5 mt-0.5 shrink-0',
                                        iconColors[t.variant]
                                    )}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                {t.title && (
                                    <p className="text-sm font-semibold">{t.title}</p>
                                )}
                                {t.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t.description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => dismissToast(t.id)}
                                className="shrink-0 rounded-md p-1 hover:bg-accent/50 transition-colors"
                            >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>,
        document.body
    );
}
