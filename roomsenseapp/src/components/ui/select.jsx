import * as React from "react";
import { cn } from "../../lib/utils";

const SelectContext = React.createContext(null);

const useSelect = () => {
    const context = React.useContext(SelectContext);
    if (!context) {
        throw new Error("useSelect must be used within a Select provider");
    }
    return context;
};

const Select = ({ children, value, onValueChange, ...props }) => {
    const [open, setOpen] = React.useState(false);

    // Close on outside click could be added here, but for now strict structure

    return (
        <SelectContext.Provider value={{ open, setOpen, value, onValueChange }}>
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    );
};

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect();

    return (
        <button
            ref={ref}
            type="button"
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            onClick={() => setOpen(!open)}
            {...props}
        >
            {children}
        </button>
    );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder, className }) => {
    const { value } = useSelect();
    return (
        <span className={cn("block truncate", className)}>
            {value || placeholder}
        </span>
    );
};

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open } = useSelect();

    if (!open) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover text-popover-foreground shadow-md border border-border animate-in fade-in-0 zoom-in-95",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setOpen } = useSelect();

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                selectedValue === value && "bg-accent",
                className
            )}
            onClick={() => {
                onValueChange?.(value);
                setOpen(false);
            }}
            {...props}
        >
            {children}
        </div>
    );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
