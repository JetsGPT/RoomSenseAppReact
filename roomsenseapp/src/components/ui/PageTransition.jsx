import React from 'react';
import { motion } from 'framer-motion';

/**
 * Page transition wrapper with Framer Motion animations
 * Provides smooth transitions between routes and pages
 */
export function PageTransition({ children, className = "" }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.3,
                ease: "easeInOut"
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Staggered animation for lists and grids
 */
export function StaggeredContainer({ children, className = "", delay = 0.1 }) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: delay
                    }
                }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Staggered item animation
 */
export function StaggeredItem({ children, className = "" }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Fade in animation
 */
export function FadeIn({ children, className = "", delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Slide in animation
 */
export function SlideIn({ children, className = "", direction = "left", delay = 0 }) {
    const directions = {
        left: { x: -50, opacity: 0 },
        right: { x: 50, opacity: 0 },
        up: { y: -50, opacity: 0 },
        down: { y: 50, opacity: 0 }
    };

    return (
        <motion.div
            initial={directions[direction]}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Scale in animation
 */
export function ScaleIn({ children, className = "", delay = 0, scale = 0.9 }) {
    return (
        <motion.div
            initial={{ scale, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
