import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Bluetooth, CheckCircle2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PairingDialog = ({
    open,
    onOpenChange,
    onConfirm,
    deviceName = "RoomSense Box",
    isSubmitting = false
}) => {
    // 6-digit PIN state
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRefs = useRef([]);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setPin(['', '', '', '', '', '']);
            setActiveIndex(0);
            // Focus first input after a short delay for animation
            setTimeout(() => inputRefs.current[0]?.focus(), 300);
        }
    }, [open]);

    // Handle input changes
    const handleChange = (index, value) => {
        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];

        // Handle paste event (if user pastes full code)
        if (value.length > 1) {
            const pastedData = value.split('').slice(0, 6);
            pastedData.forEach((char, i) => {
                if (index + i < 6) newPin[index + i] = char;
            });
            setPin(newPin);
            const nextIndex = Math.min(index + pastedData.length, 5);
            setActiveIndex(nextIndex);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        // Handle single digit entry
        newPin[index] = value;
        setPin(newPin);

        // Auto-advance to next input
        if (value && index < 5) {
            setActiveIndex(index + 1);
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace navigation
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!pin[index] && index > 0) {
                // If empty, move back and delete
                const newPin = [...pin];
                newPin[index - 1] = '';
                setPin(newPin);
                setActiveIndex(index - 1);
                inputRefs.current[index - 1]?.focus();
            } else {
                // Just delete current
                const newPin = [...pin];
                newPin[index] = '';
                setPin(newPin);
            }
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            setActiveIndex(index - 1);
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < 5) {
            setActiveIndex(index + 1);
            inputRefs.current[index + 1]?.focus();
        }
    };

    const isComplete = pin.every(digit => digit !== '');

    // Combine PIN for submission
    const handleConfirm = () => {
        if (isComplete) {
            onConfirm(pin.join(''));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden p-0 dark:bg-zinc-950/90">

                {/* Decorative Background Gradients */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="px-6 pt-8 pb-6 relative z-10 flex flex-col items-center">

                    {/* Header Icon Animation */}
                    <div className="relative mb-6">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            ) : (
                                <Bluetooth className="w-8 h-8 text-white animate-pulse" />
                            )}
                        </motion.div>
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-blue-500/30 rounded-2xl blur-lg -z-10"
                        />
                    </div>

                    <DialogHeader className="text-center space-y-2 mb-8">
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            {isSubmitting ? "Verifying Connection..." : "Device Pairing"}
                        </DialogTitle>
                        <motion.p
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-sm text-muted-foreground"
                        >
                            Enter the 6-digit code displayed on <br />
                            <span className="font-semibold text-foreground">{deviceName}</span>
                        </motion.p>
                    </DialogHeader>

                    {/* PIN Input Area */}
                    <div className="w-full flex justify-center gap-2 mb-8">
                        {pin.map((digit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                            >
                                <input
                                    ref={el => inputRefs.current[i] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    onFocus={() => setActiveIndex(i)}
                                    className={cn(
                                        "w-10 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 bg-background/50 transition-all duration-200 outline-none",
                                        "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-lg focus:shadow-blue-500/20",
                                        activeIndex === i && !digit ? "border-blue-500/50" : "border-border",
                                        digit ? "border-blue-500/80 bg-blue-500/5 text-foreground" : "text-transparent"
                                    )}
                                    disabled={isSubmitting}
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Timer / Progress Bar */}
                    <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mb-8 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full animate-shimmer" />
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 30, ease: "linear" }}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="w-full flex gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className={cn(
                                "flex-[2] transition-all duration-300 relative overflow-hidden",
                                isComplete ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] shadow-lg shadow-blue-500/25" : "bg-secondary text-secondary-foreground opacity-50 cursor-not-allowed"
                            )}
                            onClick={handleConfirm}
                            disabled={!isComplete || isSubmitting}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isSubmitting ? "Verifying..." : "Connect Device"}
                                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                            </span>
                            {/* Glow effect on hover/active */}
                            {isComplete && <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 hover:opacity-100 transition-opacity" />}
                        </Button>
                    </div>

                    {/* Security Badge */}
                    <div className="mt-6 flex items-center gap-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        Secure Encrypted Connection
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
};
