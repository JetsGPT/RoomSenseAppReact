import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Server, Globe, TestTube, Save, RotateCcw, Shield, Database } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { StaggeredContainer, StaggeredItem, FadeIn, SlideIn } from '../components/ui/PageTransition';
import api from '../services/api';

export function Admin() {
    const { settings, updateSettings } = useSettings();
    const [localApiBaseUrl, setLocalApiBaseUrl] = useState(settings.apiBaseUrl);
    const [localSensorsApiUrl, setLocalSensorsApiUrl] = useState(settings.sensorsApiUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [isWritingTestData, setIsWritingTestData] = useState(false);
    const [testDataStatus, setTestDataStatus] = useState(null);

    // Update local state when settings change
    useEffect(() => {
        setLocalApiBaseUrl(settings.apiBaseUrl);
        setLocalSensorsApiUrl(settings.sensorsApiUrl);
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save API endpoints
            updateSettings({
                apiBaseUrl: localApiBaseUrl,
                sensorsApiUrl: localSensorsApiUrl
            });
            
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
        setLocalApiBaseUrl('https://localhost:8081/api');
        setLocalSensorsApiUrl('https://localhost:8081/api');
        // Reset settings context
        updateSettings({
            apiBaseUrl: 'https://localhost:8081/api',
            sensorsApiUrl: 'https://localhost:8081/api'
        });
    };

    const testConnection = async (url, type) => {
        setIsTestingConnection(true);
        setConnectionStatus(null);
        
        try {
            const response = await fetch(`${url}/users/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                setConnectionStatus({ type, status: 'success', message: 'Connection successful!' });
            } else {
                setConnectionStatus({ type, status: 'error', message: `Connection failed: ${response.status}` });
            }
        } catch (error) {
            setConnectionStatus({ type, status: 'error', message: `Connection failed: ${error.message}` });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const writeTestData = async () => {
        setIsWritingTestData(true);
        setTestDataStatus(null);
        
        try {
            const response = await api.get('/sensors/writeTestData');
            setTestDataStatus({ status: 'success', message: 'Test data written successfully!' });
        } catch (error) {
            setTestDataStatus({ status: 'error', message: error.response?.data?.error || error.message || 'Failed to write test data' });
        } finally {
            setIsWritingTestData(false);
        }
    };

    return (
        <motion.div 
            className="min-h-screen bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
                <StaggeredContainer delay={0.1}>
                    <StaggeredItem>
                        {/* Header */}
                        <div className="mb-8">
                            <motion.div 
                                className="flex items-center gap-3 mb-4"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <Shield className="w-8 h-8 text-primary" />
                                <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
                            </motion.div>
                            <motion.p 
                                className="text-muted-foreground text-lg"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                Configure API endpoints and system settings
                            </motion.p>
                        </div>

                        {/* API Endpoint Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="w-5 h-5" />
                                    API Endpoint Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Current API Settings Display */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <InfoBlock title="Current API Endpoints">
                                        <InfoItem
                                            label="Auth API"
                                            value={settings.apiBaseUrl}
                                            icon={Globe}
                                        />
                                        <InfoItem
                                            label="Sensors API"
                                            value={settings.sensorsApiUrl}
                                            icon={Server}
                                        />
                                    </InfoBlock>

                                    <InfoBlock title="Connection Test">
                                        <div className="space-y-3">
                                            <Button
                                                onClick={() => testConnection(localApiBaseUrl, 'auth')}
                                                className="w-full justify-start"
                                                variant="outline"
                                                disabled={isTestingConnection}
                                            >
                                                <TestTube className="w-4 h-4 mr-2" />
                                                Test Auth API
                                            </Button>
                                            <Button
                                                onClick={() => testConnection(localSensorsApiUrl, 'sensors')}
                                                className="w-full justify-start"
                                                variant="outline"
                                                disabled={isTestingConnection}
                                            >
                                                <TestTube className="w-4 h-4 mr-2" />
                                                Test Sensors API
                                            </Button>
                                            <Button
                                                onClick={writeTestData}
                                                className="w-full justify-start"
                                                variant="outline"
                                                disabled={isWritingTestData || isTestingConnection}
                                            >
                                                <Database className="w-4 h-4 mr-2" />
                                                Write Test Data
                                            </Button>
                                        </div>
                                    </InfoBlock>
                                </div>

                                {/* API Endpoint Configuration */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-foreground">Configure API Endpoints</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-foreground mb-2 block">
                                                Auth API Base URL
                                            </label>
                                            <Input
                                                type="url"
                                                value={localApiBaseUrl}
                                                onChange={(e) => setLocalApiBaseUrl(e.target.value)}
                                                placeholder="https://localhost:8081/api"
                                                className="w-full"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Base URL for authentication and user management
                                            </p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-foreground mb-2 block">
                                                Sensors API Base URL
                                            </label>
                                            <Input
                                                type="url"
                                                value={localSensorsApiUrl}
                                                onChange={(e) => setLocalSensorsApiUrl(e.target.value)}
                                                placeholder="https://localhost:8081/api"
                                                className="w-full"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Base URL for sensor data and monitoring
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Connection Status */}
                                {connectionStatus && (
                                    <div className={`p-3 rounded-md border ${
                                        connectionStatus.status === 'success' 
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    }`}>
                                        <p className={`text-sm ${
                                            connectionStatus.status === 'success' 
                                                ? 'text-green-800 dark:text-green-200' 
                                                : 'text-red-800 dark:text-red-200'
                                        }`}>
                                            {connectionStatus.type === 'auth' ? 'Auth API: ' : 'Sensors API: '}
                                            {connectionStatus.message}
                                        </p>
                                    </div>
                                )}

                                {/* Test Data Status */}
                                {testDataStatus && (
                                    <div className={`p-3 rounded-md border ${
                                        testDataStatus.status === 'success' 
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    }`}>
                                        <p className={`text-sm ${
                                            testDataStatus.status === 'success' 
                                                ? 'text-green-800 dark:text-green-200' 
                                                : 'text-red-800 dark:text-red-200'
                                        }`}>
                                            Test Data: {testDataStatus.message}
                                        </p>
                                    </div>
                                )}

                                {/* Status Messages */}
                                {(localApiBaseUrl !== settings.apiBaseUrl || localSensorsApiUrl !== settings.sensorsApiUrl) && (
                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            You have unsaved API endpoint changes. Click "Save Settings" to apply the new configuration.
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

                        {/* Global Save Button */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-border">
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                disabled={isSaving}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset to Default
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || (localApiBaseUrl === settings.apiBaseUrl && localSensorsApiUrl === settings.sensorsApiUrl)}
                                className="px-8"
                            >
                                {isSaving ? (
                                    <>
                                        <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </div>
                    </StaggeredItem>
                </StaggeredContainer>
            </div>
        </motion.div>
    );
}

export default Admin;
