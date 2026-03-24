import React from 'react';
import { cn } from '../../lib/utils';

export function PageBanner({ children, className, contentClassName, imageSrc = '/assets/banner.png' }) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-[28px] border border-border/60 bg-card/80 shadow-sm',
                className
            )}
        >
            <img
                src={imageSrc}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
                draggable={false}
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/55 to-background/25"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_35%,rgba(255,255,255,0.06)_100%)]"
            />
            <div
                className={cn(
                    'relative z-10 flex min-h-[180px] flex-col justify-end gap-4 p-5 sm:min-h-[220px] sm:p-8',
                    contentClassName
                )}
            >
                {children}
            </div>
        </div>
    );
}
