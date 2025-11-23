import React from 'react';
import { cn } from '../../lib/utils';

const DatePicker = React.forwardRef(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="datetime-local"
        className={cn(
            'date-picker-input flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
        )}
        {...props}
    />
));
DatePicker.displayName = 'DatePicker';

export { DatePicker };
