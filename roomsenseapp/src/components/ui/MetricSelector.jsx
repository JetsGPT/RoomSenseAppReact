import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select";
import { getSensorIcon, getSensorName } from '../../config/sensorConfig';

const MetricSelector = ({
    value,
    onChange,
    options,
    label = "Select Metric"
}) => {
    const normalizedOptions = options.map((option) => {
        if (typeof option === 'string') {
            return {
                value: option,
                label: getSensorName(option),
                Icon: getSensorIcon(option),
            };
        }

        return {
            value: option.value,
            label: option.label,
            Icon: option.icon,
        };
    });

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                    {normalizedOptions.map((option) => {
                        const Icon = option.Icon;
                        return (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                    <span>{option.label}</span>
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
    );
};

export default MetricSelector;
