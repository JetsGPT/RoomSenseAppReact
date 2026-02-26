import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Compact error boundary for individual dashboard widgets/sections.
 * If a widget crashes, this shows a small inline error card
 * instead of taking down the entire page.
 *
 * @param {Object} props
 * @param {string} props.name - Widget/section name (e.g., "Floor Plan", "Trends")
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.className] - Additional CSS classes
 */
export class WidgetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(
            `[WidgetErrorBoundary] "${this.props.name || 'Widget'}" crashed:`,
            error,
            errorInfo
        );
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            const widgetName = this.props.name || 'Widget';

            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-6 text-center ${this.props.className || ''}`}
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-destructive">
                                Widget Error
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                The <strong>{widgetName}</strong> section encountered an error.
                            </p>
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={this.handleRetry}
                            className="gap-1.5 mt-1"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </Button>
                    </div>
                </motion.div>
            );
        }

        return this.props.children;
    }
}

export default WidgetErrorBoundary;
