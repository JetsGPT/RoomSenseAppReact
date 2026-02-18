import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Webhook,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Play,
    Zap,
    Globe,
    Lock,
    ChevronDown,
    ChevronUp,
    Power,
    PowerOff,
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
import { AutomationRuleEditor } from '@/components/automations/AutomationRuleEditor';
import { StaggeredContainer, StaggeredItem } from '@/components/ui/PageTransition';
import '@/styles/automations.css';

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

const HTTP_METHOD_COLORS = {
    POST: 'bg-green-500/15 text-green-400 border-green-500/30',
    GET: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

// ─── Component ───────────────────────────────────────────────────
export default function Automations() {
    const { activeConnections } = useConnections();
    const { toast } = useToast();

    // Data
    const [rules, setRules] = useState([]);
    const [history, setHistory] = useState([]);
    const [engineStatus, setEngineStatus] = useState(null);

    // Loading
    const [loadingRules, setLoadingRules] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [testingRuleId, setTestingRuleId] = useState(null);

    // Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Expanded rule details
    const [expandedRuleId, setExpandedRuleId] = useState(null);

    // ── Fetch helpers ─────────────────────────────────────────────
    const fetchRules = useCallback(async () => {
        setLoadingRules(true);
        try {
            const data = await notificationsAPI.getRules();
            const allRules = Array.isArray(data?.rules) ? data.rules : Array.isArray(data) ? data : [];
            // Only show webhook rules
            setRules(allRules.filter(r => r.notification_provider === 'webhook'));
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
            const allHistory = Array.isArray(data?.history) ? data.history : Array.isArray(data) ? data : [];
            // Only show webhook history entries (by checking notification_provider or notification_target pattern)
            setHistory(allHistory.filter(h => h.notification_provider === 'webhook' || h.notification_target?.startsWith('https://')));
        } catch {
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await notificationsAPI.getEngineStatus();
            setEngineStatus(data);
        } catch {
            setEngineStatus(null);
        }
    }, []);

    useEffect(() => {
        fetchRules();
        fetchHistory();
        fetchStatus();
    }, [fetchRules, fetchHistory, fetchStatus]);

    // ── Resolve sensor ID → display name ──────────────────────────
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
                toast({ title: 'Automation updated', description: 'Webhook rule saved successfully.' });
            } else {
                await notificationsAPI.createRule(formData);
                toast({ title: 'Automation created', description: 'New webhook automation created.' });
            }
            fetchRules();
        } catch (err) {
            toast({
                title: 'Error',
                description: err?.response?.data?.error || 'Failed to save automation.',
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
                description: `Automation "${rule.name || 'Unnamed'}" removed.`,
            });
            fetchRules();
        } catch {
            toast({ title: 'Error', description: 'Failed to delete automation.', variant: 'destructive' });
        }
    };

    const handleToggleRule = async (rule) => {
        try {
            await notificationsAPI.updateRule(rule.id, { is_enabled: !rule.is_enabled });
            setRules((prev) =>
                prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: !r.is_enabled } : r))
            );
        } catch {
            toast({ title: 'Error', description: 'Failed to toggle automation.', variant: 'destructive' });
        }
    };

    const handleTestRule = async (rule) => {
        setTestingRuleId(rule.id);
        try {
            await notificationsAPI.triggerRule(rule.id);
            toast({ title: 'Test sent', description: `Webhook fired to ${rule.notification_target}` });
            fetchHistory();
        } catch (err) {
            toast({
                title: 'Test failed',
                description: err?.response?.data?.error || 'Webhook test failed.',
                variant: 'destructive',
            });
        } finally {
            setTestingRuleId(null);
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

    const toggleExpanded = (ruleId) => {
        setExpandedRuleId(prev => prev === ruleId ? null : ruleId);
    };

    // ── Truncate URL for display ──────────────────────────────────
    const truncateUrl = (url, maxLen = 40) => {
        if (!url) return '—';
        try {
            const u = new URL(url);
            const display = u.hostname + u.pathname;
            return display.length > maxLen ? display.substring(0, maxLen) + '…' : display;
        } catch {
            return url.length > maxLen ? url.substring(0, maxLen) + '…' : url;
        }
    };

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 mt-6">
            <StaggeredContainer>
                {/* ── Page header ────────────────────────────────── */}
                <StaggeredItem>
                    <div className="automations-header">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Zap className="text-yellow-400" size={24} />
                                Automations
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Trigger external services via webhooks when sensor thresholds are crossed.
                            </p>
                        </div>
                        <Button onClick={openCreate} className="gap-2 flex items-center automation-create-btn">
                            <Plus size={16} />
                            New Automation
                        </Button>
                    </div>
                </StaggeredItem>

                {/* ── Engine status ─────────────────────────────── */}
                <StaggeredItem>
                    <Card className="automation-status-card">
                        <CardContent className="flex items-center gap-3 py-4">
                            <span className={`notification-status-dot ${engineStatus?.running ? 'running' : 'stopped'}`} />
                            <span className="font-medium text-sm">Rule Engine</span>
                            <Badge variant={engineStatus?.running ? 'default' : 'secondary'}>
                                {engineStatus?.running ? 'Running' : 'Stopped'}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                                {rules.length} webhook automation{rules.length !== 1 && 's'}
                            </span>
                        </CardContent>
                    </Card>
                </StaggeredItem>

                {/* ── Rules cards / table ─────────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe size={18} />
                                Webhook Rules
                            </CardTitle>
                            <CardDescription>
                                Rules that send HTTP requests to external services when sensors trigger.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingRules ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : rules.length === 0 ? (
                                <div className="automation-empty">
                                    <Webhook size={48} />
                                    <p className="font-medium text-foreground mb-1">No webhook automations yet</p>
                                    <p className="text-sm mb-4">
                                        Create your first automation to trigger external services from sensor data.
                                    </p>
                                    <Button variant="outline" onClick={openCreate} className="gap-2 flex items-center">
                                        <Plus size={16} />
                                        Create Automation
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rules.map((rule) => (
                                        <motion.div
                                            key={rule.id}
                                            className="automation-rule-card"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* Main row */}
                                            <div className="automation-rule-row" onClick={() => toggleExpanded(rule.id)}>
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {/* Enable/disable indicator */}
                                                    <div className={`automation-status-indicator ${rule.is_enabled ? 'active' : 'inactive'}`}>
                                                        {rule.is_enabled ? <Power size={14} /> : <PowerOff size={14} />}
                                                    </div>

                                                    {/* Rule info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm text-foreground">
                                                                {rule.name || 'Unnamed automation'}
                                                            </span>
                                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${HTTP_METHOD_COLORS[rule.webhook_http_method || 'POST']}`}>
                                                                {rule.webhook_http_method || 'POST'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                            <span>{sensorName(rule.sensor_id)}</span>
                                                            <span>·</span>
                                                            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                                                                {METRIC_LABELS[rule.sensor_type] || rule.sensor_type} {rule.condition} {rule.threshold}{METRIC_UNITS[rule.sensor_type] || ''}
                                                            </code>
                                                            <span>→</span>
                                                            <span className="truncate max-w-[200px]" title={rule.notification_target}>
                                                                {truncateUrl(rule.notification_target, 30)}
                                                            </span>
                                                            {rule.webhook_auth_header && (
                                                                <Lock size={10} className="text-green-400" title="Authenticated" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <Switch
                                                        checked={rule.is_enabled}
                                                        onCheckedChange={(e) => { e?.stopPropagation?.(); handleToggleRule(rule); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={(e) => { e.stopPropagation(); handleTestRule(rule); }}
                                                        disabled={testingRuleId === rule.id}
                                                        title="Test webhook"
                                                    >
                                                        {testingRuleId === rule.id
                                                            ? <Loader2 size={14} className="animate-spin" />
                                                            : <Play size={14} />
                                                        }
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={(e) => { e.stopPropagation(); openEdit(rule); }}
                                                        title="Edit rule"
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule); }}
                                                        title="Delete rule"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                    {expandedRuleId === rule.id
                                                        ? <ChevronUp size={14} className="text-muted-foreground" />
                                                        : <ChevronDown size={14} className="text-muted-foreground" />
                                                    }
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {expandedRuleId === rule.id && (
                                                <motion.div
                                                    className="automation-rule-details"
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                        <div>
                                                            <span className="text-muted-foreground block mb-0.5">URL</span>
                                                            <span className="text-foreground break-all">{rule.notification_target || '—'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground block mb-0.5">Method</span>
                                                            <span className="text-foreground">{rule.webhook_http_method || 'POST'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground block mb-0.5">Auth</span>
                                                            <span className="text-foreground">
                                                                {rule.webhook_auth_header ? '••••••••' : 'None'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground block mb-0.5">Cooldown</span>
                                                            <span className="text-foreground">{Math.round((rule.cooldown_seconds || 300) / 60)} min</span>
                                                        </div>
                                                    </div>
                                                    {rule.webhook_payload && (
                                                        <div className="mt-3">
                                                            <span className="text-xs text-muted-foreground block mb-1">Custom Payload</span>
                                                            <pre className="automation-payload-preview">
                                                                {typeof rule.webhook_payload === 'string'
                                                                    ? rule.webhook_payload
                                                                    : JSON.stringify(rule.webhook_payload, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {rule.last_triggered_at && (
                                                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock size={10} />
                                                            Last triggered: {new Date(rule.last_triggered_at).toLocaleString()}
                                                            {rule.trigger_count > 0 && ` (${rule.trigger_count} total)`}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </StaggeredItem>

                {/* ── Webhook History ─────────────────────────────── */}
                <StaggeredItem>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Webhook Activity</CardTitle>
                            <CardDescription>Latest webhook trigger attempts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="automation-empty">
                                    <Clock size={40} />
                                    <p className="text-sm">No webhook activity yet.</p>
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
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                    Value: {entry.sensor_value}
                                                    {METRIC_UNITS[entry.sensor_type] ? ` ${METRIC_UNITS[entry.sensor_type]}` : ''}
                                                    {entry.notification_target && ` → ${truncateUrl(entry.notification_target, 40)}`}
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

            {/* ── Automation editor dialog ──────────────────────── */}
            <AutomationRuleEditor
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editingRule={editingRule}
                onSave={handleSaveRule}
            />
        </div>
    );
}
