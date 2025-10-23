import React, { useState, useEffect } from 'react';
import { InfoBlock, InfoItem } from './ui/InfoBlock';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock, RefreshCw, Save, RotateCcw } from 'lucide-react';

export function Options({ fetchDelay, onFetchDelayChange, onRefreshData }) {
    const [localDelay, setLocalDelay] = useState(fetchDelay);
    const [isSaving, setIsSaving] = useState(false);

    // Update local state when prop changes
    useEffect(() => {
        setLocalDelay(fetchDelay);
    }, [fetchDelay]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onFetchDelayChange(localDelay);
            // Simulate save delay for better UX
            setTimeout(() => {
                setIsSaving(false);
            }, 500);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setLocalDelay(30);
    };

    const delayOptions = [
        { value: 5, label: '5 seconds', description: 'Very frequent updates' },
        { value: 10, label: '10 seconds', description: 'Frequent updates' },
        { value: 30, label: '30 seconds', description: 'Standard updates' },
        { value: 60, label: '1 minute', description: 'Moderate updates' },
        { value: 300, label: '5 minutes', description: 'Infrequent updates' },
        { value: 600, label: '10 minutes', description: 'Rare updates' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Settings</h2>
                <p className="text-muted-foreground">
                    Configure your sensor dashboard preferences
                </p>
            </div>

            {/* Data Fetch Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Data Fetch Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Settings Display */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <InfoBlock title="Current Settings">
                            <InfoItem
                                label="Fetch Delay"
                                value={`${fetchDelay} seconds`}
                                icon={Clock}
                            />
                            <InfoItem
                                label="Auto Refresh"
                                value={fetchDelay > 0 ? "Enabled" : "Disabled"}
                                icon={RefreshCw}
                            />
                        </InfoBlock>

                        <InfoBlock title="Quick Actions">
                            <div className="space-y-3">
                                <Button
                                    onClick={onRefreshData}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh Data Now
                                </Button>
                                <Button
                                    onClick={handleReset}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset to Default
                                </Button>
                            </div>
                        </InfoBlock>
                    </div>

                    {/* Delay Selection */}
                    <div>
                        <h3 className="text-lg font-medium text-foreground mb-4">Select Fetch Delay</h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {delayOptions.map((option) => (
                                <Button
                                    key={option.value}
                                    variant={localDelay === option.value ? "default" : "outline"}
                                    className="h-auto p-4 flex flex-col items-start text-left"
                                    onClick={() => setLocalDelay(option.value)}
                                >
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs opacity-80 mt-1">{option.description}</div>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Delay Input */}
                    <div>
                        <h3 className="text-lg font-medium text-foreground mb-4">Custom Delay</h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    Delay in seconds
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="3600"
                                    value={localDelay}
                                    onChange={(e) => setLocalDelay(parseInt(e.target.value) || 30)}
                                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || localDelay === fetchDelay}
                                className="px-6"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Minimum: 5 seconds, Maximum: 1 hour (3600 seconds)
                        </p>
                    </div>

                    {/* Status Messages */}
                    {localDelay !== fetchDelay && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                You have unsaved changes. Click "Save" to apply the new settings.
                            </p>
                        </div>
                    )}

                    {isSaving && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Saving your settings...
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Additional Settings Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Additional Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        More configuration options will be added here in future updates.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
