import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { useConnections } from '@/contexts/ConnectionsContext';
import { Loader2 } from 'lucide-react';

const METRICS = [
    { value: 'temperature', label: 'Temperature (°C)' },
    { value: 'humidity', label: 'Humidity (%)' },
    { value: 'co2', label: 'CO₂ (ppm)' },
    { value: 'voc', label: 'VOC Index' },
    { value: 'pm25', label: 'PM2.5 (µg/m³)' },
];

const OPERATORS = [
    { value: '>', label: '> Greater than' },
    { value: '<', label: '< Less than' },
    { value: '==', label: '== Equal to' },
    { value: '!=', label: '!= Not equal to' },
];

const DEFAULT_FORM = {
    sensor_id: '',
    metric: '',
    operator: '>',
    threshold: '',
    ntfy_topic: '',
    cooldown_minutes: '15',
};

/**
 * Dialog for creating or editing a notification rule.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onOpenChange - Callback to toggle open state
 * @param {Object|null} props.editingRule - Rule to edit (null = create mode)
 * @param {function} props.onSave - Called with form data on submit
 */
export function RuleEditorDialog({ open, onOpenChange, editingRule, onSave }) {
    const { activeConnections } = useConnections();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(editingRule);

    // Populate form when editing
    useEffect(() => {
        if (editingRule) {
            setForm({
                sensor_id: editingRule.sensor_id || '',
                metric: editingRule.metric || '',
                operator: editingRule.operator || '>',
                threshold: String(editingRule.threshold ?? ''),
                ntfy_topic: editingRule.ntfy_topic || '',
                cooldown_minutes: String(editingRule.cooldown_minutes ?? '15'),
            });
        } else {
            setForm(DEFAULT_FORM);
        }
    }, [editingRule, open]);

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({
                ...form,
                threshold: parseFloat(form.threshold),
                cooldown_minutes: parseInt(form.cooldown_minutes, 10) || 15,
            });
            onOpenChange(false);
        } catch {
            // Error handling is done in the parent via toast
        } finally {
            setSaving(false);
        }
    };

    const isValid =
        form.sensor_id &&
        form.metric &&
        form.operator &&
        form.threshold !== '' &&
        !isNaN(parseFloat(form.threshold)) &&
        form.ntfy_topic.trim();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Rule' : 'New Notification Rule'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update the threshold rule configuration.'
                            : 'Define a threshold rule to receive notifications via ntfy.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Sensor */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-sensor">Sensor Box</Label>
                        <Select
                            value={form.sensor_id}
                            onValueChange={(v) => handleFieldChange('sensor_id', v)}
                        >
                            <SelectTrigger id="rule-sensor">
                                <SelectValue placeholder="Select a sensor box" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeConnections.map((conn) => (
                                    <SelectItem key={conn.address} value={conn.address}>
                                        {conn.name || conn.address}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Metric */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-metric">Metric</Label>
                        <Select
                            value={form.metric}
                            onValueChange={(v) => handleFieldChange('metric', v)}
                        >
                            <SelectTrigger id="rule-metric">
                                <SelectValue placeholder="Select metric" />
                            </SelectTrigger>
                            <SelectContent>
                                {METRICS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Operator + Threshold */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="rule-operator">Condition</Label>
                            <Select
                                value={form.operator}
                                onValueChange={(v) => handleFieldChange('operator', v)}
                            >
                                <SelectTrigger id="rule-operator">
                                    <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {OPERATORS.map((op) => (
                                        <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-threshold">Threshold</Label>
                            <Input
                                id="rule-threshold"
                                type="number"
                                step="any"
                                placeholder="e.g. 25"
                                value={form.threshold}
                                onChange={(e) => handleFieldChange('threshold', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ntfy topic */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-topic">ntfy Topic</Label>
                        <Input
                            id="rule-topic"
                            type="text"
                            placeholder="e.g. roomsense-alerts"
                            value={form.ntfy_topic}
                            onChange={(e) => handleFieldChange('ntfy_topic', e.target.value)}
                        />
                    </div>

                    {/* Cooldown */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-cooldown">Cooldown (minutes)</Label>
                        <Input
                            id="rule-cooldown"
                            type="number"
                            min="1"
                            placeholder="15"
                            value={form.cooldown_minutes}
                            onChange={(e) => handleFieldChange('cooldown_minutes', e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!isValid || saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default RuleEditorDialog;
