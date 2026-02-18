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
    Play,
    Globe,
    Lock,
    Zap,
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

// ─── Constants ───────────────────────────────────────────────────
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

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'ntfy', label: 'Notifications', icon: Bell },
    { id: 'webhook', label: 'Webhooks', icon: Globe },
];

const HTTP_METHOD_COLORS = {
    POST: 'bg-green-500/15 text-green-400 border-green-500/30',
    GET: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
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

    // Tab state
    const [activeTab, setActiveTab] = useState('all');

    // Test in progress
    const [testingRuleId, setTestingRuleId] = useState(null);

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
            setRules(Array.isArray(data?.rules) ? data.rules : Array.isArray(data) ? data : []);
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
            setHistory(Array.isArray(data?.history) ? data.history : Array.isArray(data) ? data : []);
        } catch {
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchRules();
        fetchHistory();
    }, [fetchStatus, fetchRules, fetchHistory]);

    // ── Filtered data ─────────────────────────────────────────────
    const filteredRules = activeTab === 'all'
        ? rules
        : rules.filter(r => (r.notification_provider || 'ntfy') === activeTab);

    const filteredHistory = activeTab === 'all'
        ? history
        : history.filter(h => {
            if (activeTab === 'webhook') {
                return h.notification_provider === 'webhook' || h.notification_target?.startsWith('https://');
            }
            return (h.notification_provider || 'ntfy') === 'ntfy';
        });

    // ── Resolve sensor name ───────────────────────────────────────
    const sensorName = useCallback(
        (sensorId) => {
            const conn = activeConnections.find((c) => c.address === sensorId);
            return conn?.name || conn?.address || sensorId || 'Unknown';
        },
        [activeConnections]
    );

    // ── CRUD handlers ─────────────────────────────────────────────
    const handleSaveRule = async (formData) => {
        try {
            if (editingRule) {
                await notificationsAPI.updateRule(editingRule.id, formData);
                toast({ title: 'Rule updated', description: 'Rule saved successfully.' });
            } else {
                await notificationsAPI.createRule(formData);
                toast({ title: 'Rule created', description: 'New rule created.' });
            }
            fetchRules();
        } catch (err) {
            toast({
                title: 'Error',
                description: err?.response?.data?.error || 'Failed to save rule.',
                variant: 'destructive',
            });
            throw err;
        }
    };

    const handleDeleteRule = async (rule) => {
        try {
            await notificationsAPI.deleteRule(rule.id);
            toast({
                title: 'Deleted',
                description: `Rule "${rule.name || METRIC_LABELS[rule.sensor_type] || rule.sensor_type}" removed.`,
            });
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

    const handleTestRule = async (rule) => {
        setTestingRuleId(rule.id);
        try {
            await notificationsAPI.triggerRule(rule.id);
            toast({ title: 'Test sent', description: `Triggered: ${rule.name || rule.notification_target}` });
            fetchHistory();
        } catch (err) {
            toast({
                title: 'Test failed',
                description: err?.response?.data?.error || 'Test failed.',
                variant: 'destructive',
            });
        } finally {
            setTestingRuleId(null);
        }
    };

    const openCreate = () => { setEditingRule(null); setDialogOpen(true); };
    const openEdit = (rule) => { setEditingRule(rule); setDialogOpen(true); };

    // ── Helpers ────────────────────────────────────────────────────
    const statusVariant = engineStatus?.running ? 'default' : engineStatus?.error ? 'destructive' : 'secondary';
    const statusLabel = engineStatus?.running ? 'Running' : engineStatus?.error ? 'Error' : 'Stopped';
    const statusDotClass = engineStatus?.running ? 'running' : engineStatus?.error ? 'error' : 'stopped';

    const truncateUrl = (url, maxLen = 35) => {
        if (!url) return '—';
        try {
            const u = new URL(url);
            const display = u.hostname + u.pathname;
            return display.length > maxLen ? display.substring(0, maxLen) + '…' : display;
        } catch {
            return url.length > maxLen ? url.substring(0, maxLen) + '…' : url;
        }
    };

    const isWebhookRule = (rule) => rule.notification_provider === 'webhook';

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto mt-6">
            <StaggeredContainer>
                {/* ── Page header ────────────────────────────────── */}
                <StaggeredItem>
                    <div className="notifications-header">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Bell size={22} />
                                Notifications & Automations
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Manage alert rules, webhook automations, and view activity history.
                            </p>
                        </div>
                        <Button onClick={openCreate} className="gap-2 flex items-center">
                            <Plus size={16} />
                            New Rule
                        </Button>
                    </div>
                </StaggeredItem>

                {/* ── Tab filter ────────────────────────────────── */}
                <StaggeredItem>
                    <div className="rules-tab-bar">
                        {TABS.map((tab) => {
                            const count = tab.id === 'all'
                                ? rules.length
                                : rules.filter(r => (r.notification_provider || 'ntfy') === tab.id).length;
                            return (
                                <button
                                    key={tab.id}
                                    className={`rules-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon && <tab.icon size={14} />}
                                    {tab.label}
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                                        {count}
                                    </Badge>
                                </button>
                            );
                        })}
                    </div>
                </StaggeredItem>

                {/* ── Engine status ─────────────────────────────── */}
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
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {filteredRules.length} rule{filteredRules.length !== 1 && 's'}
                                    </span>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </StaggeredItem>

                {/* ── Rules table ───────────────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Rules</CardTitle>
                            <CardDescription>
                                {activeTab === 'all' && 'All notification and webhook rules'}
                                {activeTab === 'ntfy' && 'Push notification rules via ntfy'}
                                {activeTab === 'webhook' && 'Webhook automation rules'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingRules ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredRules.length === 0 ? (
                                <div className="notification-empty">
                                    <BellOff size={48} />
                                    <p className="font-medium text-foreground mb-1">No rules yet</p>
                                    <p className="text-sm mb-4">
                                        Create your first rule to start receiving alerts or triggering webhooks.
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
                                                <TableHead>Type</TableHead>
                                                <TableHead>Sensor</TableHead>
                                                <TableHead>Condition</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead className="text-center">Enabled</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRules.map((rule) => (
                                                <TableRow key={rule.id}>
                                                    {/* Type badge */}
                                                    <TableCell>
                                                        {isWebhookRule(rule) ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] px-1.5 py-0 font-mono ${HTTP_METHOD_COLORS[rule.webhook_http_method || 'POST']}`}
                                                                >
                                                                    {rule.webhook_http_method || 'POST'}
                                                                </Badge>
                                                                {rule.webhook_auth_header && (
                                                                    <Lock size={10} className="text-green-400" title="Authenticated" />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                <Bell size={10} className="mr-1" />
                                                                ntfy
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    {/* Sensor + Metric */}
                                                    <TableCell className="font-medium">
                                                        <div>{sensorName(rule.sensor_id)}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {METRIC_LABELS[rule.sensor_type] || rule.sensor_type}
                                                        </div>
                                                    </TableCell>

                                                    {/* Condition */}
                                                    <TableCell>
                                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                            {rule.condition} {rule.threshold}
                                                            {METRIC_UNITS[rule.sensor_type] || ''}
                                                        </code>
                                                    </TableCell>

                                                    {/* Target */}
                                                    <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                                                        <span className="truncate block" title={rule.notification_target}>
                                                            {isWebhookRule(rule)
                                                                ? truncateUrl(rule.notification_target)
                                                                : rule.notification_target}
                                                        </span>
                                                    </TableCell>

                                                    {/* Toggle */}
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={rule.is_enabled}
                                                            onCheckedChange={() => handleToggleRule(rule)}
                                                        />
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {isWebhookRule(rule) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleTestRule(rule)}
                                                                    disabled={testingRuleId === rule.id}
                                                                    title="Test webhook"
                                                                >
                                                                    {testingRuleId === rule.id
                                                                        ? <Loader2 size={14} className="animate-spin" />
                                                                        : <Play size={14} />}
                                                                </Button>
                                                            )}
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

                {/* ── Activity history ──────────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                            <CardDescription>Last 20 notification and webhook events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="notification-empty">
                                    <Clock size={40} />
                                    <p className="text-sm">No activity yet.</p>
                                </div>
                            ) : (
                                <div className="notification-history">
                                    {filteredHistory.map((entry, idx) => (
                                        <motion.div
                                            key={entry.id || idx}
                                            className="history-entry"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                        >
                                            <div className="mt-0.5">
                                                {entry.status === 'sent' ? (
                                                    <CheckCircle2 size={16} className="text-green-500" />
                                                ) : entry.status === 'failed' ? (
                                                    <XCircle size={16} className="text-destructive" />
                                                ) : (
                                                    <AlertTriangle size={16} className="text-yellow-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-sm text-foreground">
                                                        {METRIC_LABELS[entry.sensor_type] || entry.sensor_type}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {sensorName(entry.sensor_id)}
                                                    </Badge>
                                                    {(entry.notification_provider === 'webhook' || entry.notification_target?.startsWith('https://')) && (
                                                        <Globe size={12} className="text-muted-foreground" title="Webhook" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                    Value: {entry.sensor_value}
                                                    {METRIC_UNITS[entry.sensor_type] ? ` ${METRIC_UNITS[entry.sensor_type]}` : ''}
                                                    {entry.notification_target && ` → ${entry.notification_target.startsWith('https://')
                                                            ? truncateUrl(entry.notification_target, 40)
                                                            : entry.notification_target
                                                        }`}
                                                </p>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {entry.sent_at
                                                    ? new Date(entry.sent_at).toLocaleString()
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
