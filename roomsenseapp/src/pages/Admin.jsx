import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { InfoBlock, InfoItem } from '../components/ui/InfoBlock';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Server, Globe, TestTube, Save, RotateCcw, Shield, Database, Users, RefreshCw, Loader2, Key, Plus, Trash2, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { StaggeredContainer, StaggeredItem, FadeIn, SlideIn } from '../components/ui/PageTransition';
import { authAPI } from '../services/api';
import api from '../services/api';

export function Admin() {
    const { settings, updateSettings } = useSettings();
    const { user: currentUser } = useAuth();
    const [localApiBaseUrl, setLocalApiBaseUrl] = useState(settings.apiBaseUrl);
    const [localSensorsApiUrl, setLocalSensorsApiUrl] = useState(settings.sensorsApiUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [isWritingTestData, setIsWritingTestData] = useState(false);
    const [testDataStatus, setTestDataStatus] = useState(null);
    
    // User management state
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState(null);
    const [updatingRoles, setUpdatingRoles] = useState(new Set());
    
    // Roles and Permissions management state
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [permissionsError, setPermissionsError] = useState(null);
    const [editingPermissions, setEditingPermissions] = useState([]);
    
    // Role creation/deletion state
    const [newRoleName, setNewRoleName] = useState('');
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [reassignToRole, setReassignToRole] = useState('');
    const [isDeletingRole, setIsDeletingRole] = useState(false);

    // Update local state when settings change
    useEffect(() => {
        setLocalApiBaseUrl(settings.apiBaseUrl);
        setLocalSensorsApiUrl(settings.sensorsApiUrl);
    }, [settings]);

    // Fetch users and roles on mount if admin
    useEffect(() => {
        if (currentUser?.role === 'admin') {
            fetchUsers();
            fetchRoles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);
    
    // Fetch permissions when role is selected
    useEffect(() => {
        if (selectedRole) {
            fetchRolePermissions(selectedRole);
        } else {
            setPermissions([]);
            setEditingPermissions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRole]);

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

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        setUsersError(null);
        try {
            const usersData = await authAPI.getAllUsers();
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsersError(error.response?.data?.error || error.message || 'Failed to fetch users');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingRoles(prev => new Set(prev).add(userId));
        try {
            const updatedUser = await authAPI.updateUserRole(userId, newRole);
            // Update the user in the local state
            setUsers(prevUsers => 
                prevUsers.map(u => u.id === userId ? updatedUser : u)
            );
        } catch (error) {
            console.error('Error updating user role:', error);
            setUsersError(error.response?.data?.error || error.message || 'Failed to update user role');
        } finally {
            setUpdatingRoles(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    // Roles and Permissions functions
    const fetchRoles = async () => {
        setIsLoadingRoles(true);
        setPermissionsError(null);
        try {
            const rolesData = await authAPI.getAllRoles();
            setRoles(rolesData);
        } catch (error) {
            console.error('Error fetching roles:', error);
            setPermissionsError(error.response?.data?.error || error.message || 'Failed to fetch roles');
        } finally {
            setIsLoadingRoles(false);
        }
    };

    const fetchRolePermissions = async (role) => {
        setIsLoadingPermissions(true);
        setPermissionsError(null);
        try {
            const data = await authAPI.getRolePermissions(role);
            setPermissions(data.permissions || []);
            setEditingPermissions(data.permissions || []);
        } catch (error) {
            console.error('Error fetching role permissions:', error);
            setPermissionsError(error.response?.data?.error || error.message || 'Failed to fetch permissions');
        } finally {
            setIsLoadingPermissions(false);
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        
        setIsSavingPermissions(true);
        setPermissionsError(null);
        try {
            const data = await authAPI.updateRolePermissions(selectedRole, editingPermissions);
            setPermissions(data.permissions || []);
            setEditingPermissions(data.permissions || []);
        } catch (error) {
            console.error('Error saving permissions:', error);
            setPermissionsError(error.response?.data?.error || error.message || 'Failed to save permissions');
        } finally {
            setIsSavingPermissions(false);
        }
    };

    const addPermission = () => {
        setEditingPermissions([...editingPermissions, {
            method: '*',
            path_pattern: '/',
            match_type: 'prefix',
            allow: true,
            rate_limit_max: 0,
            rate_limit_window_ms: 0
        }]);
    };

    const removePermission = (index) => {
        setEditingPermissions(editingPermissions.filter((_, i) => i !== index));
    };

    const updatePermission = (index, field, value) => {
        const updated = [...editingPermissions];
        updated[index] = { ...updated[index], [field]: value };
        setEditingPermissions(updated);
    };

    const hasChanges = () => {
        if (permissions.length !== editingPermissions.length) return true;
        return JSON.stringify(permissions) !== JSON.stringify(editingPermissions);
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            setPermissionsError('Role name is required');
            return;
        }
        
        setIsCreatingRole(true);
        setPermissionsError(null);
        try {
            await authAPI.createRole(newRoleName.trim());
            setNewRoleName('');
            await fetchRoles(); // Refresh roles list
        } catch (error) {
            console.error('Error creating role:', error);
            setPermissionsError(error.response?.data?.error || error.message || 'Failed to create role');
        } finally {
            setIsCreatingRole(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!roleToDelete) return;
        
        setIsDeletingRole(true);
        setPermissionsError(null);
        try {
            const reassignTo = reassignToRole.trim() || null;
            await authAPI.deleteRole(roleToDelete, reassignTo);
            setRoleToDelete(null);
            setReassignToRole('');
            await fetchRoles(); // Refresh roles list
            await fetchUsers(); // Refresh users list (roles may have changed)
            if (selectedRole === roleToDelete) {
                setSelectedRole(null); // Clear selection if deleted role was selected
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            setPermissionsError(error.response?.data?.error || error.message || 'Failed to delete role');
        } finally {
            setIsDeletingRole(false);
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

                        {/* User Management Section - Only for admins */}
                        {currentUser?.role === 'admin' && (
                            <Card className="mt-8">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            User Management
                                        </CardTitle>
                                        <Button
                                            onClick={fetchUsers}
                                            variant="outline"
                                            size="sm"
                                            disabled={isLoadingUsers}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {usersError && (
                                        <div className="p-3 rounded-md border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                            <p className="text-sm text-red-800 dark:text-red-200">
                                                {usersError}
                                            </p>
                                        </div>
                                    )}

                                    {isLoadingUsers ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                            <span className="ml-2 text-muted-foreground">Loading users...</span>
                                        </div>
                                    ) : users.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No users found
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>ID</TableHead>
                                                        <TableHead>Username</TableHead>
                                                        <TableHead>Role</TableHead>
                                                        <TableHead>Created At</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {users.map((user) => (
                                                        <TableRow key={user.id}>
                                                            <TableCell className="font-medium">{user.id}</TableCell>
                                                            <TableCell>{user.username}</TableCell>
                                                            <TableCell>
                                                                <select
                                                                    value={user.role || ''}
                                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                                    disabled={updatingRoles.has(user.id) || user.id === currentUser?.id || roles.length === 0}
                                                                    className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {roles.length === 0 ? (
                                                                        <option value="">Loading roles...</option>
                                                                    ) : (
                                                                        <>
                                                                            <option value="">-- Select role --</option>
                                                                            {roles.map((role) => (
                                                                                <option key={role} value={role}>
                                                                                    {role}
                                                                                </option>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                </select>
                                                                {updatingRoles.has(user.id) && (
                                                                    <Loader2 className="w-3 h-3 ml-2 inline animate-spin text-muted-foreground" />
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {user.created_at 
                                                                    ? new Date(user.created_at).toLocaleString()
                                                                    : 'N/A'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {user.id === currentUser?.id && (
                                                                    <span className="text-xs text-muted-foreground">Current user</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Roles & Permissions Management Section - Only for admins */}
                        {currentUser?.role === 'admin' && (
                            <Card className="mt-8">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Key className="w-5 h-5" />
                                            Roles & Permissions Management
                                        </CardTitle>
                                        <Button
                                            onClick={fetchRoles}
                                            variant="outline"
                                            size="sm"
                                            disabled={isLoadingRoles}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingRoles ? 'animate-spin' : ''}`} />
                                            Refresh Roles
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {permissionsError && (
                                        <div className="p-3 rounded-md border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                            <p className="text-sm text-red-800 dark:text-red-200">
                                                {permissionsError}
                                            </p>
                                        </div>
                                    )}

                                    {/* Create New Role */}
                                    <div className="space-y-2 p-4 border border-border rounded-md bg-card">
                                        <label className="text-sm font-medium text-foreground">
                                            Create New Role
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="text"
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                                placeholder="Enter role name"
                                                disabled={isCreatingRole}
                                                className="flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !isCreatingRole) {
                                                        handleCreateRole();
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={handleCreateRole}
                                                disabled={isCreatingRole || !newRoleName.trim()}
                                                size="sm"
                                            >
                                                {isCreatingRole ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Create Role
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Role Selection and Management */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Select Role to Manage Permissions
                                        </label>
                                        {isLoadingRoles ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Loading roles...</span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedRole || ''}
                                                    onChange={(e) => setSelectedRole(e.target.value || null)}
                                                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    <option value="">-- Select a role --</option>
                                                    {roles.map((role) => (
                                                        <option key={role} value={role}>
                                                            {role}
                                                        </option>
                                                    ))}
                                                </select>
                                                {selectedRole && (
                                                    <Button
                                                        onClick={() => setRoleToDelete(selectedRole)}
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={isDeletingRole}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete Role
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete Role Dialog */}
                                    {roleToDelete && (
                                        <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-destructive">
                                                    Delete Role: <span className="font-bold">{roleToDelete}</span>
                                                </h4>
                                                <Button
                                                    onClick={() => {
                                                        setRoleToDelete(null);
                                                        setReassignToRole('');
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isDeletingRole}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Users with this role will have their role set to NULL unless you reassign them.
                                            </p>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-foreground">
                                                    Reassign users to (optional):
                                                </label>
                                                <select
                                                    value={reassignToRole}
                                                    onChange={(e) => setReassignToRole(e.target.value)}
                                                    disabled={isDeletingRole}
                                                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    <option value="">-- No reassignment (set to NULL) --</option>
                                                    {roles.filter(r => r !== roleToDelete).map((role) => (
                                                        <option key={role} value={role}>
                                                            {role}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    onClick={() => {
                                                        setRoleToDelete(null);
                                                        setReassignToRole('');
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isDeletingRole}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleDeleteRole}
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={isDeletingRole}
                                                >
                                                    {isDeletingRole ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Confirm Delete
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Permissions Editor */}
                                    {selectedRole && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium text-foreground">
                                                    Permissions for: <span className="text-primary">{selectedRole}</span>
                                                </h3>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={addPermission}
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isSavingPermissions || isLoadingPermissions}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Permission
                                                    </Button>
                                                    <Button
                                                        onClick={handleSavePermissions}
                                                        size="sm"
                                                        disabled={isSavingPermissions || isLoadingPermissions || !hasChanges()}
                                                    >
                                                        {isSavingPermissions ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save className="w-4 h-4 mr-2" />
                                                                Save Permissions
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            {isLoadingPermissions ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                    <span className="ml-2 text-muted-foreground">Loading permissions...</span>
                                                </div>
                                            ) : editingPermissions.length === 0 ? (
                                                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                                                    No permissions configured. Click "Add Permission" to create one.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {editingPermissions.map((perm, index) => (
                                                        <div
                                                            key={index}
                                                            className="p-4 border border-border rounded-md bg-card"
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {/* Method */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-muted-foreground">Method</label>
                                                                        <select
                                                                            value={perm.method || '*'}
                                                                            onChange={(e) => updatePermission(index, 'method', e.target.value)}
                                                                            disabled={isSavingPermissions}
                                                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                                        >
                                                                            <option value="*">* (All)</option>
                                                                            <option value="GET">GET</option>
                                                                            <option value="POST">POST</option>
                                                                            <option value="PUT">PUT</option>
                                                                            <option value="PATCH">PATCH</option>
                                                                            <option value="DELETE">DELETE</option>
                                                                            <option value="HEAD">HEAD</option>
                                                                            <option value="OPTIONS">OPTIONS</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Path Pattern */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-muted-foreground">Path Pattern</label>
                                                                        <Input
                                                                            type="text"
                                                                            value={perm.path_pattern || '/'}
                                                                            onChange={(e) => updatePermission(index, 'path_pattern', e.target.value)}
                                                                            disabled={isSavingPermissions}
                                                                            placeholder="/api/..."
                                                                            className="text-sm"
                                                                        />
                                                                    </div>

                                                                    {/* Match Type */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-muted-foreground">Match Type</label>
                                                                        <select
                                                                            value={perm.match_type || 'prefix'}
                                                                            onChange={(e) => updatePermission(index, 'match_type', e.target.value)}
                                                                            disabled={isSavingPermissions}
                                                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                                        >
                                                                            <option value="prefix">Prefix</option>
                                                                            <option value="exact">Exact</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Allow */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-muted-foreground">Allow</label>
                                                                        <select
                                                                            value={perm.allow ? 'true' : 'false'}
                                                                            onChange={(e) => updatePermission(index, 'allow', e.target.value === 'true')}
                                                                            disabled={isSavingPermissions}
                                                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                                        >
                                                                            <option value="true">Allow</option>
                                                                            <option value="false">Deny</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Rate Limit Max */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-muted-foreground">Rate Limit Max</label>
                                                                        <Input
                                                                            type="number"
                                                                            value={perm.rate_limit_max || 0}
                                                                            onChange={(e) => updatePermission(index, 'rate_limit_max', parseInt(e.target.value) || 0)}
                                                                            disabled={isSavingPermissions}
                                                                            min="0"
                                                                            className="text-sm"
                                                                        />
                                                                    </div>

                                                                    {/* Rate Limit Window (ms) */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-muted-foreground">Window (ms)</label>
                                                                        <Input
                                                                            type="number"
                                                                            value={perm.rate_limit_window_ms || 0}
                                                                            onChange={(e) => updatePermission(index, 'rate_limit_window_ms', parseInt(e.target.value) || 0)}
                                                                            disabled={isSavingPermissions}
                                                                            min="0"
                                                                            className="text-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    onClick={() => removePermission(index)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={isSavingPermissions}
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {hasChanges() && (
                                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                        You have unsaved permission changes. Click "Save Permissions" to apply them.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </StaggeredItem>
                </StaggeredContainer>
            </div>
        </motion.div>
    );
}

export default Admin;
