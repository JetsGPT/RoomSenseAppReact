import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, Search, Plus, Trash2, Box, RefreshCw, Pencil } from 'lucide-react';
import { bleAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useConnections } from '@/contexts/ConnectionsContext';
import { StaggeredContainer, StaggeredItem, FadeIn } from '@/components/ui/PageTransition';
import { RenameDeviceDialog } from '@/components/RenameDeviceDialog';
import { PairingDialog } from '@/components/PairingDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatePresence } from 'framer-motion';

const BoxManagement = () => {
    const { activeConnections, loading: isLoadingConnections, refreshConnections, setPollingPaused } = useConnections();
    const [scannedDevices, setScannedDevices] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [connectingDevices, setConnectingDevices] = useState(new Set());
    const [disconnectingDevices, setDisconnectingDevices] = useState(new Set());
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [deviceToRename, setDeviceToRename] = useState(null);

    // Pairing State
    const [pinDialogOpen, setPinDialogOpen] = useState(false);
    const [pairingDevice, setPairingDevice] = useState(null);
    const [pinCode, setPinCode] = useState("");
    const { toast } = useToast();

    // Fetch active connections on mount is handled by context, but we can refresh to be sure
    useEffect(() => {
        refreshConnections(true);
    }, [refreshConnections]);

    const fetchActiveConnections = () => refreshConnections();

    const handleScan = async () => {
        setIsScanning(true);
        setScannedDevices([]);
        try {
            const devices = await bleAPI.scanDevices();
            setScannedDevices(devices);
            toast({
                title: "Scan Complete",
                description: `Found ${devices.length} device(s)`,
            });
        } catch (error) {
            console.error('Scan failed:', error);
            toast({
                title: "Scan Failed",
                description: error.message || "Failed to scan for devices",
                variant: "destructive",
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleConnect = async (address, name) => {
        // Force uppercase
        const upperAddress = address.toUpperCase();
        setConnectingDevices(prev => new Set(prev).add(upperAddress));

        // Pause background polling so it doesn't mess with our state or cause race conditions
        setPollingPaused(true);

        try {
            const maxDuration = 45000; // Increased to 45s to accommodate extended timeouts
            const startTime = Date.now();

            while (Date.now() - startTime < maxDuration) {
                // The backend will hang for up to 30s (Long Poll)
                const response = await bleAPI.connectDevice(upperAddress, name);

                // Scenario A: PIN Required
                if (response.status === 'pin_required') {
                    setPairingDevice({ address: upperAddress, name });
                    setPinDialogOpen(true);
                    // NOTE: We do NOT remove from connectingDevices yet.
                    // We also keep polling PAUSED until the user finishes the PIN flow.
                    return;
                }

                // Scenario B: Connected (Success)
                if (response.status === 'connected') {
                    toast({
                        title: "Connected",
                        description: `Successfully connected to ${name || upperAddress}`,
                    });

                    setPollingPaused(false);
                    await refreshConnections();
                    setScannedDevices(prev => prev.filter(d => d.address !== upperAddress));
                    return;
                }

                // Scenario C: Converting Timeout (Backend sends explicit timeout status now)
                if (response.status === 'timeout') {
                    throw new Error("Connection timed out (backend reported timeout).");
                }

                // Scenario D: Connecting (Intermediate State)
                if (response.status === 'connecting') {
                    // The backend is still trying. We MUST retry immediately to catch the next status change.
                    continue;
                }

                // Catch-all for other statuses
                throw new Error(`Unexpected status: ${response.status}`);
            }

            throw new Error("Connection timed out. Device took too long to respond.");

        } catch (error) {
            console.error('Connection failed:', error);

            // Handle 500 or other errors generic
            const msg = error.response?.data?.detail || error.message || "Failed to connect to device";

            toast({
                title: "Connection Failed",
                description: msg,
                variant: "destructive",
            });
            // If failed, resume polling
            setPollingPaused(false);
        } finally {
            // Only clear loading state if we are NOT opening the PIN dialog
            if (!pinDialogOpen) {
                setConnectingDevices(prev => {
                    const newSet = new Set(prev);
                    // We need to clear by upperAddress
                    newSet.delete(upperAddress);
                    // Also try original address just in case
                    newSet.delete(address);
                    return newSet;
                });
                if (!deviceToRename) {
                    setPollingPaused(false);
                }
            }
        }
    };

    const handlePinSubmit = async (pin) => {
        // Update state first
        setPinCode(pin);

        // We can't immediately call submitPin() because it relies on the state `pinCode`
        // which won't be updated until next render.
        // Instead, we should refactor logic to accept pin as argument.
        await submitPin(pin);
    };

    const submitPin = async (submittedPin = null) => {
        // Use argument if provided, otherwise fallback to state
        const codeToUse = submittedPin || pinCode;
        if (!pairingDevice || !codeToUse) return;

        try {
            setPinDialogOpen(false);

            // Backend expects integer
            const pinInt = parseInt(codeToUse, 10);

            // Response handling
            const response = await bleAPI.pairDevice(pairingDevice.address, pinInt);

            // 1. Success
            if (response.status === 'paired') {
                toast({
                    title: "Success",
                    description: "Device paired and connected",
                });

                // Clean up UI - Wait a moment for stabilization
                await new Promise(r => setTimeout(r, 1000));

                setPollingPaused(false);
                await refreshConnections();
                setScannedDevices(prev => prev.filter(d => d.address !== pairingDevice.address));
                return;
            }

            // 2. Failure with details
            if (response.status === 'pairing_failed') {
                throw new Error(response.detail || "Pairing failed");
            }

            // 3. Timeout specifically
            if (response.status === 'pairing_timeout') {
                throw new Error("PIN entry timed out");
            }

            // 4. Pin Submitted (Old behavior fallback, just in case, but unlikely based on new reqs)
            if (response.status === 'pin_submitted') {
                // Treat as pending? For now, we assume 'paired' is the new standard for success.
                // But let's show a toast just in case logic falls here.
                toast({
                    title: "PIN Submitted",
                    description: "Verifying connection...",
                });
                // Revert to polling check logic if needed, but user didn't specify this fallback.
                // We'll trust 'paired' is sent on success.
                setPollingPaused(false);
                await refreshConnections();
                return;
            }

            // Catch-all
            throw new Error(`Unexpected pairing status: ${response.status}`);

        } catch (error) {
            console.error('Pairing failed:', error);

            let errorMsg = error.message || "Invalid PIN or timeout";

            // Handle 400 Bad Request specifically if axios throws it
            if (error.response && error.response.status === 400) {
                errorMsg = "Invalid Device Address or PIN";
            } else if (error.response && error.response.data && error.response.data.detail) {
                errorMsg = error.response.data.detail;
            }

            toast({
                title: "Pairing Failed",
                description: errorMsg,
                variant: "destructive"
            });
            // Resume polling on error
            setPollingPaused(false);
        } finally {
            // Always clear the spinner for this device
            setConnectingDevices(prev => {
                const newSet = new Set(prev);
                newSet.delete(pairingDevice.address);
                return newSet;
            });
            setPinCode("");
            setPairingDevice(null);
            // Ensure polling is definitely resumed
            setPollingPaused(false);
        }
    };

    const handleDisconnect = async (address, name) => {
        setDisconnectingDevices(prev => new Set(prev).add(address));
        try {
            await bleAPI.disconnectDevice(address);
            toast({
                title: "Disconnected",
                description: `Disconnected from ${name || address}`,
            });
            // Refresh connections
            await refreshConnections();
        } catch (error) {
            console.error('Disconnect failed:', error);
            toast({
                title: "Disconnect Failed",
                description: error.message || "Failed to disconnect from device",
                variant: "destructive",
            });
        } finally {
            setDisconnectingDevices(prev => {
                const newSet = new Set(prev);
                newSet.delete(address);
                return newSet;
            });
        }
    };

    const handleRenameClick = (device) => {
        setDeviceToRename(device);
        setRenameDialogOpen(true);
    };

    const handleRename = async (address, display_name) => {
        try {
            await bleAPI.renameDevice(address, display_name);
            toast({
                title: "Renamed",
                description: `Device renamed to "${display_name}"`,
            });
            // Refresh connections to get updated name
            await refreshConnections();
        } catch (error) {
            console.error('Rename failed:', error);
            throw error; // Re-throw to be handled by dialog
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6">
            <FadeIn>
                <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">My Boxes</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Manage your RoomSense slave boxes and BLE connections
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Active Connections Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Wifi className="h-5 w-5" />
                                            Active Connections
                                        </CardTitle>
                                        <CardDescription>
                                            Currently connected slave boxes
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={fetchActiveConnections}
                                        disabled={isLoadingConnections}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isLoadingConnections ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoadingConnections ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : activeConnections.length === 0 ? (
                                    <div className="text-center py-12">
                                        <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                        <p className="text-muted-foreground">No active connections</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Scan for devices to connect
                                        </p>
                                    </div>
                                ) : (
                                    <StaggeredContainer className="space-y-3">
                                        {activeConnections.map((device, index) => (
                                            <StaggeredItem key={device.address} index={index}>
                                                <motion.div
                                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3 sm:gap-0"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <div className="p-2 rounded-full bg-green-500/10 flex-shrink-0">
                                                            <Box className="h-5 w-5 text-green-500" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium truncate">{device.name || 'Unknown Device'}</p>
                                                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                                                {device.original_name ? `${device.address} • ID: ${device.original_name}` : device.address}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                        <Badge variant="success" className="bg-green-500/10 text-green-700 dark:text-green-400 whitespace-nowrap">
                                                            Connected
                                                        </Badge>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleRenameClick(device)}
                                                            className="flex-shrink-0"
                                                            title="Rename device"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            onClick={() => handleDisconnect(device.address, device.name)}
                                                            disabled={disconnectingDevices.has(device.address)}
                                                            className="flex-shrink-0"
                                                        >
                                                            {disconnectingDevices.has(device.address) ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            </StaggeredItem>
                                        ))}
                                    </StaggeredContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Scan for Devices Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Scan for Devices
                                </CardTitle>
                                <CardDescription>
                                    Find nearby RoomSense slave boxes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Button
                                        onClick={handleScan}
                                        disabled={isScanning}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isScanning ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="mr-2 h-5 w-5" />
                                                Start Scan
                                            </>
                                        )}
                                    </Button>

                                    {scannedDevices.length > 0 && (
                                        <StaggeredContainer className="space-y-3 mt-4">
                                            {scannedDevices.map((device, index) => {
                                                const isAlreadyConnected = activeConnections.some(
                                                    conn => conn.address === device.address
                                                );
                                                return (
                                                    <StaggeredItem key={device.address} index={index}>
                                                        <motion.div
                                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3 sm:gap-0"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                <div className="p-2 rounded-full bg-blue-500/10 flex-shrink-0">
                                                                    <Box className="h-5 w-5 text-blue-500" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-medium truncate">{device.name || 'Unknown Device'}</p>
                                                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{device.address}</p>
                                                                </div>
                                                            </div>
                                                            {isAlreadyConnected ? (
                                                                <Badge variant="secondary" className="whitespace-nowrap">Already Connected</Badge>
                                                            ) : (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => handleConnect(device.address, device.name)}
                                                                    disabled={connectingDevices.has(device.address)}
                                                                    className="w-full sm:w-auto flex-shrink-0"
                                                                >
                                                                    {connectingDevices.has(device.address) ? (
                                                                        <>
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                            Connecting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Plus className="mr-2 h-4 w-4" />
                                                                            Connect
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </motion.div>
                                                    </StaggeredItem>
                                                );
                                            })}
                                        </StaggeredContainer>
                                    )}

                                    {!isScanning && scannedDevices.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No devices scanned yet</p>
                                            <p className="text-sm mt-1">Click "Start Scan" to find devices</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </FadeIn>

            <RenameDeviceDialog
                device={deviceToRename}
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                onRename={handleRename}
            />

            {/* PIN Entry Dialog */}
            <PairingDialog
                open={pinDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setPinDialogOpen(false);
                        // If closed without success, stop connecting spinner AND resume polling
                        if (pairingDevice) {
                            setConnectingDevices(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(pairingDevice.address);
                                return newSet;
                            });
                            setPollingPaused(false);
                        }
                    } else {
                        setPinDialogOpen(true);
                    }
                }}
                onConfirm={(pin) => {
                    setPinCode(pin);
                    // Trigger submission immediately
                    // Ideally pass submitPin directly but submitPin relies on pinCode state
                    // Let's refactor submitPin to accept pin argument or update state and then call

                    // Since submitPin relies on state `pinCode`, we need to set it first.
                    // However, useState is async. 
                    // Better approach: Call a specific submit handler that takes the pin directly.
                    handlePinSubmit(pin);
                }}
                deviceName={pairingDevice?.name || "RoomSense Box"}
                isSubmitting={false} // We don't have a separate submitting state for the dialog yet
            />
        </div>
    );
};

export default BoxManagement;
