import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error boundary component for catching and handling React errors
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Function} props.onError - Error callback
 * @param {React.Component} props.fallback - Custom fallback component
 * @param {Object} props.className - Additional CSS classes
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Call error callback if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback component
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry);
            }

            // Default error UI
            return (
                <div className={`min-h-[400px] w-full flex flex-col items-center justify-center p-8 text-center ${this.props.className || ''}`}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="max-w-md w-full space-y-6"
                    >
                        {/* Icon with pulse effect */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-destructive" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                Oops! Something went wrong
                            </h2>
                            <p className="text-muted-foreground">
                                We encountered an unexpected error. Don't worry, it's not your fault.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <Button onClick={this.handleRetry} size="lg" className="gap-2 shadow-md">
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => window.location.reload()}
                                className="gap-2"
                            >
                                Refresh Page
                            </Button>
                        </div>

                        {/* Technical Details (Collapsible) */}
                        {this.state.error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-8 pt-8 border-t border-border/50"
                            >
                                <details className="group text-left">
                                    <summary className="flex items-center justify-center cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors list-none gap-1 select-none">
                                        <span>Show Technical Details</span>
                                        <span className="group-open:rotate-180 transition-transform duration-200">▼</span>
                                    </summary>
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="mt-4 overflow-hidden"
                                    >
                                        <div className="p-4 bg-muted/50 rounded-lg border border-border/50 text-left">
                                            <p className="text-xs font-mono text-destructive mb-2 font-semibold break-all">
                                                {this.state.error.toString()}
                                            </p>
                                            {this.state.errorInfo && (
                                                <pre className="text-[10px] text-muted-foreground overflow-auto max-h-40 custom-scrollbar font-mono leading-relaxed">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            )}
                                        </div>
                                    </motion.div>
                                </details>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook-based error boundary for functional components
 * @param {Function} errorHandler - Error handler function
 * @returns {Function} Error boundary wrapper
 */
export const useErrorBoundary = (errorHandler) => {
    return React.useCallback((error, errorInfo) => {
        console.error('useErrorBoundary caught an error:', error, errorInfo);
        if (errorHandler) {
            errorHandler(error, errorInfo);
        }
    }, [errorHandler]);
};
