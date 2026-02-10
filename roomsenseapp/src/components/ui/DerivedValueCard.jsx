import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Activity, Droplets, ThermometerSun } from 'lucide-react';
import NumberFlow from '@number-flow/react';

const DerivedValueCard = ({
    type, // 'heatIndex', 'dewPoint', 'correlation'
    value,
    unit,
    label,
    description
}) => {
    let Icon = Activity;
    let color = "text-muted-foreground";

    if (type === 'heatIndex') {
        Icon = ThermometerSun;
        color = "text-orange-500";
    } else if (type === 'dewPoint') {
        Icon = Droplets;
        color = "text-blue-500";
    } else if (type === 'correlation') {
        Icon = Activity;
        color = "text-purple-500";
    }

    // Format value
    const displayValue = type === 'correlation' ? (value?.toFixed(3) ?? '--') : (value?.toFixed(1) ?? '--');
    const suffix = unit || '';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {value !== null && value !== undefined ? (
                        type === 'correlation' ? displayValue : <NumberFlow value={value} suffix={suffix} />
                    ) : (
                        '--'
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default DerivedValueCard;
