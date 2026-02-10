import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    BellOff,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/nightmode/switch';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useToast } from '@/hooks/use-toast';
import { notificationsAPI } from '@/services/notificationsAPI';
import { RuleEditorDialog } from '@/components/notifications/RuleEditorDialog';
import { StaggeredContainer, StaggeredItem } from '@/components/ui/PageTransition';
import '@/styles/notifications.css';

// ─── Metric display helpers ──────────────────────────────────────
const METRIC_LABELS = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    co2: 'CO₂',
    voc: 'VOC',
    pm25: 'PM2.5',
};

const METRIC_UNITS = {
    temperature: '°C',
    humidity: '%',
    co2: 'ppm',
    voc: '',
    pm25: 'µg/m³',
};

// ─── Component ───────────────────────────────────────────────────
export default function Notifications() {
    const { activeConnections } = useConnections();
    const { toast } = useToast();

    // Data state
    const [engineStatus, setEngineStatus] = useState(null);
    const [rules, setRules] = useState([]);
    const [history, setHistory] = useState([]);

    // Loading flags
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loadingRules, setLoadingRules] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // ── Fetch helpers ─────────────────────────────────────────────
    const fetchStatus = useCallback(async () => {
        setLoadingStatus(true);
        try {
            const data = await notificationsAPI.getEngineStatus();
            setEngineStatus(data);
        } catch {
            setEngineStatus({ running: false, error: true });
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    const fetchRules = useCallback(async () => {
        setLoadingRules(true);
        try {
            const data = await notificationsAPI.getRules();
            setRules(Array.isArray(data) ? data : []);
        } catch {
            setRules([]);
        } finally {
            setLoadingRules(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const data = await notificationsAPI.getHistory({ limit: 20 });
            setHistory(Array.isArray(data) ? data : []);
        } catch {
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchStatus();
        fetchRules();
        fetchHistory();
    }, [fetchStatus, fetchRules, fetchHistory]);

    // ── Resolve sensor ID → display name ──────────────────────────
    const sensorName = useCallback(
        (sensorId) => {
            const conn = activeConnections.find(
                (c) => c.address === sensorId
            );
            return conn?.name || conn?.address || sensorId || 'Unknown';
        },
        [activeConnections]
    );

    // ── CRUD handlers ─────────────────────────────────────────────
    const handleSaveRule = async (formData) => {
        try {
            if (editingRule) {
                await notificationsAPI.updateRule(editingRule.id, formData);
                toast({ title: 'Rule updated', description: 'Notification rule saved successfully.', variant: 'default' });
            } else {
                await notificationsAPI.createRule(formData);
                toast({ title: 'Rule created', description: 'New notification rule created.', variant: 'default' });
            }
            fetchRules();
        } catch (err) {
            toast({
                title: 'Error',
                description: err?.response?.data?.error || 'Failed to save rule.',
                variant: 'destructive',
            });
            throw err; // re-throw so the dialog stays open
        }
    };

    const handleDeleteRule = async (rule) => {
        try {
            await notificationsAPI.deleteRule(rule.id);
            toast({ title: 'Deleted', description: `Rule "${METRIC_LABELS[rule.metric] || rule.metric}" removed.`, variant: 'default' });
            fetchRules();
        } catch {
            toast({ title: 'Error', description: 'Failed to delete rule.', variant: 'destructive' });
        }
    };

    const handleToggleRule = async (rule) => {
        try {
            await notificationsAPI.updateRule(rule.id, { is_enabled: !rule.is_enabled });
            setRules((prev) =>
                prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: !r.is_enabled } : r))
            );
        } catch {
            toast({ title: 'Error', description: 'Failed to toggle rule.', variant: 'destructive' });
        }
    };

    const openCreate = () => {
        setEditingRule(null);
        setDialogOpen(true);
    };

    const openEdit = (rule) => {
        setEditingRule(rule);
        setDialogOpen(true);
    };

    // ── Status badge helper ───────────────────────────────────────
    const statusVariant = engineStatus?.running
        ? 'default'
        : engineStatus?.error
            ? 'destructive'
            : 'secondary';

    const statusLabel = engineStatus?.running
        ? 'Running'
        : engineStatus?.error
            ? 'Error'
            : 'Stopped';

    const statusDotClass = engineStatus?.running
        ? 'running'
        : engineStatus?.error
            ? 'error'
            : 'stopped';

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 mt-6">
            <StaggeredContainer>
                {/* ── Page header ────────────────────────────────── */}
                <StaggeredItem>
                    <div className="notifications-header">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Notifications
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Manage threshold rules and view notification history.
                            </p>
                        </div>
                        <Button onClick={openCreate} className="gap-2 flex items-center">
                            <Plus size={16} />
                            New Rule
                        </Button>
                    </div>
                </StaggeredItem>

                {/* ── Engine status banner ───────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardContent className="flex items-center gap-3 py-4">
                            {loadingStatus ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <span className={`notification-status-dot ${statusDotClass}`} />
                                    <span className="font-medium text-sm">Rule Engine</span>
                                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                                    {engineStatus?.checkedAt && (
                                        <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
                                            Last check: {new Date(engineStatus.checkedAt).toLocaleTimeString()}
                                        </span>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </StaggeredItem>

                {/* ── Rules table ────────────────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Active Rules</CardTitle>
                            <CardDescription>
                                {rules.length} rule{rules.length !== 1 && 's'} configured
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingRules ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : rules.length === 0 ? (
                                <div className="notification-empty">
                                    <BellOff size={48} />
                                    <p className="font-medium text-foreground mb-1">No rules yet</p>
                                    <p className="text-sm mb-4">
                                        Create your first threshold rule to start receiving notifications.
                                    </p>
                                    <Button variant="outline" onClick={openCreate} className="gap-2 flex items-center">
                                        <Plus size={16} />
                                        Create Rule
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Sensor</TableHead>
                                                <TableHead>Metric</TableHead>
                                                <TableHead>Condition</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead className="text-center">Enabled</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rules.map((rule) => (
                                                <TableRow key={rule.id}>
                                                    <TableCell className="font-medium">
                                                        {sensorName(rule.sensor_id)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {METRIC_LABELS[rule.metric] || rule.metric}
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                            {rule.operator} {rule.threshold}
                                                            {METRIC_UNITS[rule.metric] || ''}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {rule.ntfy_topic}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={rule.is_enabled}
                                                            onCheckedChange={() => handleToggleRule(rule)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => openEdit(rule)}
                                                                title="Edit rule"
                                                            >
                                                                <Pencil size={14} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={() => handleDeleteRule(rule)}
                                                                title="Delete rule"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </StaggeredItem>

                {/* ── Notification history ───────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Notifications</CardTitle>
                            <CardDescription>Last 20 notification events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="notification-empty">
                                    <Clock size={40} />
                                    <p className="text-sm">No notification history yet.</p>
                                </div>
                            ) : (
                                <div className="notification-history">
                                    {history.map((entry, idx) => (
                                        <motion.div
                                            key={entry.id || idx}
                                            className="history-entry"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                        >
                                            {/* Icon */}
                                            <div className="mt-0.5">
                                                {entry.status === 'sent' ? (
                                                    <CheckCircle2 size={16} className="text-green-500" />
                                                ) : entry.status === 'failed' ? (
                                                    <XCircle size={16} className="text-destructive" />
                                                ) : (
                                                    <AlertTriangle size={16} className="text-yellow-500" />
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-sm text-foreground">
                                                        {METRIC_LABELS[entry.metric] || entry.metric}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {sensorName(entry.sensor_id)}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                    Value: {entry.value}
                                                    {METRIC_UNITS[entry.metric] ? ` ${METRIC_UNITS[entry.metric]}` : ''}
                                                    {entry.ntfy_topic && ` → ${entry.ntfy_topic}`}
                                                </p>
                                            </div>

                                            {/* Timestamp */}
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {entry.created_at
                                                    ? new Date(entry.created_at).toLocaleString()
                                                    : '—'}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </StaggeredItem>
            </StaggeredContainer>

            {/* ── Rule editor dialog ────────────────────────────── */}
            <RuleEditorDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editingRule={editingRule}
                onSave={handleSaveRule}
            />
        </div>
    );
}
