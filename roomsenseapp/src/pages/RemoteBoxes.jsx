import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, Wifi, WifiOff, RefreshCw, Radio, Unplug, Send } from 'lucide-react';
import { useOutsideServer } from '@/contexts/OutsideServerContext';
import { StaggeredContainer, StaggeredItem, FadeIn } from '@/components/ui/PageTransition';

const RemoteBoxes = () => {
    const {
        isOutsideConnected,
        healthLoading,
        checkHealth,
        outsideUser,
        isOutsideAuthenticated,
        wsStatus,
        wsMessages,
        connectGateway,
        disconnectGateway,
        sendGatewayMessage,
    } = useOutsideServer();

    // Auto-connect to gateway when on this page and authenticated
    useEffect(() => {
        if (isOutsideAuthenticated && isOutsideConnected && wsStatus === 'disconnected') {
            connectGateway();
        }
    }, [isOutsideAuthenticated, isOutsideConnected, wsStatus, connectGateway]);

    const wsStatusConfig = {
        connected: { label: 'Connected', variant: 'default', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
        connecting: { label: 'Connecting...', variant: 'secondary', className: '' },
        disconnected: { label: 'Disconnected', variant: 'outline', className: '' },
    };

    const currentWsStatus = wsStatusConfig[wsStatus] || wsStatusConfig.disconnected;

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6">
            <FadeIn>
                <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
                    >
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Remote Boxes</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">
                                Manage sensor boxes connected via the Outside Server gateway
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge className={currentWsStatus.className} variant={currentWsStatus.variant}>
                                <Radio className="h-3 w-3 mr-1" />
                                Gateway: {currentWsStatus.label}
                            </Badge>
                        </div>
                    </motion.div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Outside Server Status */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isOutsideConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                        <Globe className={`h-5 w-5 ${isOutsideConnected ? 'text-green-500' : 'text-red-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Outside Server</p>
                                        <p className="text-xs text-muted-foreground">
                                            {healthLoading ? 'Checking...' : isOutsideConnected ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto"
                                        onClick={checkHealth}
                                        disabled={healthLoading}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Auth Status */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isOutsideAuthenticated ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                                        {isOutsideAuthenticated ? (
                                            <Wifi className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <WifiOff className="h-5 w-5 text-amber-500" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Outside Auth</p>
                                        <p className="text-xs text-muted-foreground">
                                            {isOutsideAuthenticated
                                                ? outsideUser?.user?.user_metadata?.username || outsideUser?.user?.email || 'Signed in'
                                                : 'Not signed in'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* WebSocket Status */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500/10' : 'bg-muted'}`}>
                                        <Radio className={`h-5 w-5 ${wsStatus === 'connected' ? 'text-green-500' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Gateway</p>
                                        <p className="text-xs text-muted-foreground">
                                            {wsStatus === 'connected'
                                                ? `${wsMessages.length} messages received`
                                                : wsStatus === 'connecting' ? 'Connecting...' : 'Not connected'}
                                        </p>
                                    </div>
                                    {wsStatus === 'disconnected' ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="ml-auto"
                                            onClick={connectGateway}
                                            disabled={!isOutsideConnected}
                                        >
                                            Connect
                                        </Button>
                                    ) : wsStatus === 'connected' ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="ml-auto"
                                            onClick={disconnectGateway}
                                        >
                                            <Unplug className="h-4 w-4 mr-1" />
                                            Disconnect
                                        </Button>
                                    ) : (
                                        <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Not authenticated warning */}
                    {!isOutsideAuthenticated && (
                        <Card className="border-amber-500/40 bg-amber-500/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <WifiOff className="h-5 w-5 text-amber-500 shrink-0" />
                                    <div>
                                        <p className="font-medium text-amber-700 dark:text-amber-400">Not signed in to Outside Server</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Sign in via the Login page using "Outside Server" mode to access remote boxes and the WebSocket gateway.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Gateway Messages */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Radio className="h-5 w-5" />
                                        Gateway Feed
                                    </CardTitle>
                                    <CardDescription>
                                        Real-time messages from connected boxes via WebSocket
                                    </CardDescription>
                                </div>
                                {wsStatus === 'connected' && (
                                    <Badge variant="outline">
                                        {wsMessages.length} messages
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {wsStatus !== 'connected' ? (
                                <div className="text-center py-12">
                                    <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground">Connect to the gateway to see real-time data</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {!isOutsideAuthenticated
                                            ? 'Sign in to the Outside Server first'
                                            : !isOutsideConnected
                                                ? 'Outside Server is offline'
                                                : 'Click "Connect" above to start'}
                                    </p>
                                </div>
                            ) : wsMessages.length === 0 ? (
                                <div className="text-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-muted-foreground">Waiting for messages from connected boxes...</p>
                                </div>
                            ) : (
                                <StaggeredContainer className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {[...wsMessages].reverse().map((msg, index) => (
                                        <StaggeredItem key={index} index={index}>
                                            <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                                                    {typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)}
                                                </pre>
                                            </div>
                                        </StaggeredItem>
                                    ))}
                                </StaggeredContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </FadeIn>
        </div>
    );
};

export default RemoteBoxes;
