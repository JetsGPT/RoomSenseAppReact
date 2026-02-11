import { useState, useEffect, useCallback } from 'react';
import { useConnections } from '../contexts/ConnectionsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/nightmode/switch';
import { toast } from '../components/ui/toaster';
import { SENSOR_TYPES } from '../config/comfortConfig';
import {
    Zap,
    Plus,
    Trash2,
    GripVertical,
    Thermometer,
    Droplets,
    Lightbulb,
    Gauge,
    Activity,
    Wind,
    Eye,
    ArrowRight,
    ChevronRight,
} from 'lucide-react';

// ── Constants ──

const CONDITIONS = [
    { value: '>', label: 'greater than (>)' },
    { value: '<', label: 'less than (<)' },
    { value: '=', label: 'equal to (=)' },
    { value: '>=', label: 'greater or equal (≥)' },
    { value: '<=', label: 'less or equal (≤)' },
];

const ACTIONS = [
    { value: 'fan_on', label: 'Turn Fan On' },
    { value: 'fan_off', label: 'Turn Fan Off' },
    { value: 'heater_on', label: 'Turn Heater On' },
    { value: 'heater_off', label: 'Turn Heater Off' },
    { value: 'light_on', label: 'Turn Light On' },
    { value: 'light_off', label: 'Turn Light Off' },
    { value: 'ac_on', label: 'Turn AC On' },
    { value: 'ac_off', label: 'Turn AC Off' },
    { value: 'humidifier_on', label: 'Turn Humidifier On' },
    { value: 'humidifier_off', label: 'Turn Humidifier Off' },
    { value: 'notify', label: 'Send Notification' },
];

const STORAGE_KEY = 'roomsense-automation-rules';

const sensorIconMap = {
    temperature: Thermometer,
    humidity: Droplets,
    light: Lightbulb,
    pressure: Gauge,
    motion: Activity,
    voltage: Zap,
    wind_speed: Wind,
    visibility: Eye,
};

// ── Helpers ──

function loadRules() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function saveRules(rules) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function buildSensorOptions(activeConnections) {
    const options = [];
    for (const conn of activeConnections) {
        const boxLabel = conn.name || conn.address;
        for (const key of Object.keys(SENSOR_TYPES)) {
            const cfg = SENSOR_TYPES[key];
            options.push({
                value: `${conn.address}::${key}`,
                label: `${cfg.label} — ${boxLabel}`,
                sensorType: key,
                boxAddress: conn.address,
                boxName: boxLabel,
                unit: cfg.unit,
            });
        }
    }
    return options;
}

function describeRule(rule, sensorOptions) {
    const sensor = sensorOptions.find((s) => s.value === rule.sensor);
    const action = ACTIONS.find((a) => a.value === rule.action);
    const sensorLabel = sensor?.label || rule.sensor || '?';
    const condLabel = CONDITIONS.find((c) => c.value === rule.condition)?.label || rule.condition;
    const unit = sensor?.unit || '';
    const actionLabel = action?.label || rule.action || '?';
    return { sensorLabel, condLabel, unit, actionLabel };
}

// ── Page Component ──

const Automations = () => {
    const { activeConnections } = useConnections();
    const sensorOptions = buildSensorOptions(activeConnections);

    const [rules, setRules] = useState(loadRules);

    // Form state
    const [form, setForm] = useState({
        sensor: '',
        condition: '>',
        threshold: '',
        action: '',
    });

    // Persist rules on change
    useEffect(() => {
        saveRules(rules);
    }, [rules]);

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const canSubmit =
        form.sensor && form.condition && form.threshold !== '' && form.action;

    const handleAddRule = (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        const newRule = {
            id: Date.now(),
            sensor: form.sensor,
            condition: form.condition,
            threshold: Number(form.threshold),
            action: form.action,
            enabled: true,
        };

        setRules((prev) => [newRule, ...prev]);
        setForm({ sensor: '', condition: '>', threshold: '', action: '' });
        toast({
            title: 'Rule created',
            description: 'Your automation rule has been added.',
            variant: 'success',
        });
    };

    const handleToggle = useCallback((id) => {
        setRules((prev) =>
            prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
        );
    }, []);

    const handleDelete = useCallback((id) => {
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast({
            title: 'Rule deleted',
            variant: 'default',
        });
    }, []);

    const selectedSensor = sensorOptions.find((s) => s.value === form.sensor);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-display text-3xl font-semibold text-foreground mb-1">
                        Automations
                    </h1>
                    <p className="text-muted-foreground">
                        Create simple if-then rules to automate actions based on sensor readings.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* ── Rule Builder ── */}
                    <section>
                        <div className="mb-4">
                            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" />
                                New Rule
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Define a trigger condition and an action to execute.
                            </p>
                        </div>

                        <Card>
                            <CardContent className="pt-6">
                                <form onSubmit={handleAddRule}>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        {/* Trigger Sensor */}
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="sensor">Trigger Sensor</Label>
                                            <select
                                                id="sensor"
                                                value={form.sensor}
                                                onChange={(e) =>
                                                    handleFormChange('sensor', e.target.value)
                                                }
                                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Select a sensor…</option>
                                                {sensorOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {sensorOptions.length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    No sensor boxes connected. Connect a box in{' '}
                                                    <span className="font-medium">My Boxes</span>{' '}
                                                    first.
                                                </p>
                                            )}
                                        </div>

                                        {/* Condition */}
                                        <div className="space-y-2">
                                            <Label htmlFor="condition">Condition</Label>
                                            <select
                                                id="condition"
                                                value={form.condition}
                                                onChange={(e) =>
                                                    handleFormChange('condition', e.target.value)
                                                }
                                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                {CONDITIONS.map((c) => (
                                                    <option key={c.value} value={c.value}>
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Threshold */}
                                        <div className="space-y-2">
                                            <Label htmlFor="threshold">
                                                Threshold Value
                                                {selectedSensor?.unit
                                                    ? ` (${selectedSensor.unit})`
                                                    : ''}
                                            </Label>
                                            <Input
                                                id="threshold"
                                                type="number"
                                                step="any"
                                                placeholder="e.g. 25"
                                                value={form.threshold}
                                                onChange={(e) =>
                                                    handleFormChange('threshold', e.target.value)
                                                }
                                            />
                                        </div>

                                        {/* Action Actor */}
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="action">Action</Label>
                                            <select
                                                id="action"
                                                value={form.action}
                                                onChange={(e) =>
                                                    handleFormChange('action', e.target.value)
                                                }
                                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Select an action…</option>
                                                {ACTIONS.map((a) => (
                                                    <option key={a.value} value={a.value}>
                                                        {a.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    {canSubmit && (
                                        <div className="mt-5 rounded-xl bg-accent/20 px-4 py-3 flex items-center gap-2 text-sm text-foreground flex-wrap">
                                            <span className="font-medium">If</span>
                                            <Badge variant="secondary">
                                                {selectedSensor?.label || form.sensor}
                                            </Badge>
                                            <span>
                                                {
                                                    CONDITIONS.find(
                                                        (c) => c.value === form.condition
                                                    )?.label
                                                }
                                            </span>
                                            <Badge variant="outline">
                                                {form.threshold}
                                                {selectedSensor?.unit
                                                    ? ` ${selectedSensor.unit}`
                                                    : ''}
                                            </Badge>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                                            <Badge>
                                                {
                                                    ACTIONS.find((a) => a.value === form.action)
                                                        ?.label
                                                }
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="mt-6 flex justify-end">
                                        <Button type="submit" disabled={!canSubmit}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Rule
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator />

                    {/* ── Rules List ── */}
                    <section>
                        <div className="mb-4">
                            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary" />
                                Active Rules
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {rules.length === 0
                                    ? 'No rules yet. Create one above to get started.'
                                    : `${rules.length} rule${rules.length !== 1 ? 's' : ''} configured.`}
                            </p>
                        </div>

                        {rules.length > 0 && (
                            <Card>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {rules.map((rule) => (
                                            <RuleRow
                                                key={rule.id}
                                                rule={rule}
                                                sensorOptions={sensorOptions}
                                                onToggle={handleToggle}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {rules.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                                        <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground mb-1">
                                        No automation rules yet
                                    </p>
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                        Use the form above to create your first rule. Rules run
                                        locally and react to real-time sensor data.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

// ── Rule Row ──

function RuleRow({ rule, sensorOptions, onToggle, onDelete }) {
    const { sensorLabel, condLabel, unit, actionLabel } = describeRule(
        rule,
        sensorOptions
    );
    const sensorMeta = sensorOptions.find((s) => s.value === rule.sensor);
    const SensorIcon = sensorMeta
        ? sensorIconMap[sensorMeta.sensorType] || Zap
        : Zap;

    return (
        <div
            className={`flex items-center gap-4 px-6 py-4 transition-opacity ${
                rule.enabled ? '' : 'opacity-50'
            }`}
        >
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <SensorIcon className="h-4 w-4 text-primary" />
            </div>

            {/* Description */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap text-sm">
                    <span className="font-medium text-foreground">If</span>
                    <span className="text-foreground">{sensorLabel}</span>
                    <span className="text-muted-foreground">{condLabel}</span>
                    <Badge variant="outline" className="text-xs">
                        {rule.threshold}
                        {unit ? ` ${unit}` : ''}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge className="text-xs">{actionLabel}</Badge>
                </div>
                {sensorMeta && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Box: {sensorMeta.boxName}
                    </p>
                )}
            </div>

            {/* Toggle */}
            <Switch
                checked={rule.enabled}
                onCheckedChange={() => onToggle(rule.id)}
            />

            {/* Delete */}
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(rule.id)}
                className="text-muted-foreground hover:text-destructive"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export default Automations;
