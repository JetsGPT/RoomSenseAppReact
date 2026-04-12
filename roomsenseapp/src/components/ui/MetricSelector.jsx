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
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((sensorType) => {
                        const Icon = getSensorIcon(sensorType);
                        return (
                            <SelectItem key={sensorType} value={sensorType}>
                                <div className="flex items-center gap-2">
                                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                    <span>{getSensorName(sensorType)}</span>
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
