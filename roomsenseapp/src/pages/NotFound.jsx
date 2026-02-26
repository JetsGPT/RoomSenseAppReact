import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { LayoutDashboard, Home, ArrowLeft } from 'lucide-react';

// Floating star component
const Star = ({ delay, size, top, left }) => (
    <motion.div
        className="absolute rounded-full bg-primary"
        style={{ width: size, height: size, top, left }}
        animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.5, 1],
        }}
        transition={{
            duration: 2,
            repeat: Infinity,
            delay,
            ease: 'easeInOut',
        }}
    />
);

// Particle component
const Particle = ({ delay, startX, startY }) => (
    <motion.div
        className="absolute w-1 h-1 rounded-full bg-primary/50"
        style={{ left: startX, top: startY }}
        animate={{
            x: [0, 10, -5, 15, 0],
            y: [0, -15, -25, -10, 0],
            opacity: [0.3, 0.7, 0.5, 0.8, 0.3],
        }}
        transition={{
            duration: 6,
            repeat: Infinity,
            delay,
            ease: 'easeInOut',
        }}
    />
);

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--primary-rgb,121,188,158),0.08)_0%,transparent_50%)] pointer-events-none" />

            {/* Stars */}
            <Star delay={0} size={3} top="8%" left="15%" />
            <Star delay={0.4} size={3} top="15%" left="75%" />
            <Star delay={0.8} size={3} top="30%" left="5%" />
            <Star delay={1.2} size={3} top="25%" left="90%" />
            <Star delay={0.2} size={3} top="50%" left="20%" />
            <Star delay={0.6} size={3} top="55%" left="85%" />
            <Star delay={1.0} size={3} top="70%" left="10%" />
            <Star delay={1.4} size={3} top="75%" left="60%" />
            <Star delay={0.3} size={2} top="40%" left="45%" />
            <Star delay={0.9} size={2} top="20%" left="55%" />
            <Star delay={1.1} size={2} top="85%" left="35%" />
            <Star delay={0.7} size={4} top="65%" left="50%" />

            {/* Floating particles */}
            <Particle delay={0} startX="25%" startY="40%" />
            <Particle delay={1} startX="70%" startY="60%" />
            <Particle delay={2} startX="50%" startY="30%" />

            {/* Main content */}
            <div className="relative z-10 text-center px-6 max-w-lg">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="space-y-6"
                >
                    {/* Space illustration */}
                    <div className="relative w-72 h-60 mx-auto">
                        {/* Planet with ring */}
                        <motion.svg
                            className="absolute bottom-0 left-2 opacity-70"
                            width="110"
                            height="110"
                            viewBox="0 0 120 120"
                            fill="none"
                            animate={{
                                y: [0, -6, 0],
                                x: [0, 4, 0],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            <circle cx="60" cy="60" r="35" fill="currentColor" className="text-primary/20" stroke="currentColor" strokeWidth="1.5" className2="text-primary" />
                            <circle cx="60" cy="60" r="35" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
                            <ellipse cx="60" cy="60" rx="55" ry="12" stroke="currentColor" strokeWidth="1.5" className="text-primary" opacity="0.4" transform="rotate(-20 60 60)" />
                        </motion.svg>

                        {/* Floating Sensor Box */}
                        <motion.svg
                            className="absolute top-2 right-4 text-primary drop-shadow-[0_0_12px_rgba(121,188,158,0.4)]"
                            width="140"
                            height="140"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            animate={{
                                y: [0, -18, -8, -22, 0],
                                rotate: [-5, 2, -3, 5, -5],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            {/* Box body */}
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                            {/* Antenna */}
                            <line x1="12" y1="2" x2="12" y2="0.5" strokeWidth="2" />
                            <circle cx="12" cy="0.2" r="0.6" fill="currentColor" />
                            {/* Signal waves */}
                            <path d="M15 3.5c1 -0.5 2 0 2.5 1" strokeWidth="1" opacity="0.5" />
                            <path d="M16 2c1.5 -0.8 3 0 3.5 1.5" strokeWidth="1" opacity="0.3" />
                        </motion.svg>
                    </div>

                    {/* Text */}
                    <div>
                        <h1 className="text-6xl sm:text-7xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-3">
                            404
                        </h1>
                        <h2 className="text-xl sm:text-2xl font-semibold text-primary mb-3">
                            This sensor is lost in space…
                        </h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            The page you're looking for has drifted beyond our signal range.
                            Don't worry — we'll guide you back to mission control.
                        </p>
                    </div>

                    {/* Action buttons */}
                    <motion.div
                        className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        <Button asChild size="lg" className="gap-2 shadow-md">
                            <Link to="/dashboard">
                                <LayoutDashboard className="w-4 h-4" />
                                Back to Dashboard
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="gap-2">
                            <Link to="/">
                                <Home className="w-4 h-4" />
                                Go Home
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="lg"
                            className="gap-2"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
