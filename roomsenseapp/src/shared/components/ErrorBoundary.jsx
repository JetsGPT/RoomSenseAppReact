import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
                <Card className={`w-full ${this.props.className || ''}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Something went wrong
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                            </p>
                            
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-4">
                                    <summary className="cursor-pointer text-sm font-medium">
                                        Error Details (Development)
                                    </summary>
                                    <div className="mt-2 p-3 bg-muted rounded-md">
                                        <pre className="text-xs overflow-auto">
                                            {this.state.error.toString()}
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </div>
                                </details>
                            )}
                            
                            <div className="flex gap-2">
                                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => window.location.reload()}
                                >
                                    Refresh Page
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
