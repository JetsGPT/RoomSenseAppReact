import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { sensorsAPI } from '../../services/sensorsAPI';
import { AlertTriangle, CheckCircle, Droplets, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming cn utility exists, usually does in shadcn/ui setups

export const MoldRiskWidget = ({ sensorBoxId, className }) => {
    const [riskData, setRiskData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!sensorBoxId) return;
            try {
                // Only show full loading spinner if we don't have data yet
                if (!riskData) setLoading(true);

                const data = await sensorsAPI.getMoldRisk(sensorBoxId);

                if (isMounted) {
                    setRiskData(data);
                    setError(null);
                }
            } catch (err) {
                console.error("Failed to fetch mold risk:", err);
                if (isMounted) setError("Failed to load risk data");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [sensorBoxId]);

    if (!sensorBoxId) return null;

    if (loading && !riskData) {
        return (
            <Card className={cn("w-full h-full flex items-center justify-center min-h-[200px]", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={cn("w-full border-red-200 bg-red-50", className)}>
                <CardContent className="flex items-center justify-center p-6 text-red-500">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    <span>{error}</span>
                </CardContent>
            </Card>
        );
    }

    const { status, riskScore, explanation, dangerDurationHours, warningDurationHours, isStale } = riskData;

    // Visual Config based on Status
    const config = {
        green: {
            color: 'bg-green-500',
            textColor: 'text-green-600',
            borderColor: 'border-green-200',
            shadow: 'shadow-green-100',
            icon: CheckCircle,
            label: 'Low Risk'
        },
        yellow: {
            color: 'bg-yellow-500',
            textColor: 'text-yellow-600',
            borderColor: 'border-yellow-200',
            shadow: 'shadow-yellow-100',
            icon: AlertTriangle,
            label: 'Warning'
        },
        red: {
            color: 'bg-red-500',
            textColor: 'text-red-600',
            borderColor: 'border-red-200',
            shadow: 'shadow-red-100',
            icon: Droplets,
            label: 'High Risk'
        }
    }[status] || {
        color: 'bg-gray-400',
        textColor: 'text-gray-500',
        borderColor: 'border-gray-200',
        shadow: 'shadow-none',
        icon: Info,
        label: 'Unknown'
    };

    const StatusIcon = config.icon;

    return (
        <Card className={cn("w-full overflow-hidden transition-all duration-300", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">Mold Risk Analysis</CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                                <p>Risk is calculated based on ASHRAE standards, monitoring sustained periods of high humidity and temperature favorable for mold growth.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <CardDescription>
                    Real-time environment monitoring
                    {isStale && <span className="ml-2 text-xs text-orange-500 font-medium">(Data Stale)</span>}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-4 space-y-6">

                    {/* Traffic Light Indicator */}
                    <div className="relative">
                        {/* Pulse Effect for Red/Yellow */}
                        {(status === 'red' || status === 'yellow') && (
                            <motion.div
                                className={cn("absolute inset-0 rounded-full opacity-50", config.color)}
                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: status === 'red' ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                        )}

                        {/* Main Circle */}
                        <div className={cn(
                            "relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-colors duration-500",
                            config.color,
                            "text-white"
                        )}>
                            <StatusIcon className="w-10 h-10" strokeWidth={2.5} />
                        </div>

                        {/* Status Label Badge */}
                        <div className={cn(
                            "absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white border shadow-sm whitespace-nowrap",
                            config.textColor,
                            config.borderColor
                        )}>
                            {config.label}
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="text-center space-y-1 max-w-[90%]">
                        <p className="text-sm font-medium text-foreground">
                            {explanation}
                        </p>
                        <div className="text-xs text-muted-foreground">
                            {status === 'red' && <span>Danger sustained for {dangerDurationHours.toFixed(1)}h</span>}
                            {status === 'yellow' && <span>Warning sustained for {warningDurationHours.toFixed(1)}h</span>}
                            {status === 'green' && <span>Environment is well-balanced</span>}
                        </div>
                    </div>

                    {/* Simple Metric Bar */}
                    <div className="w-full space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Safe</span>
                            <span>Critical</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                className={cn("h-full rounded-full transition-all duration-500", config.color)}
                                initial={{ width: 0 }}
                                animate={{ width: `${riskScore}%` }}
                            />
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
};
