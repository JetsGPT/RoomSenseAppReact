import { useId } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Label } from "@/components/ui/nightmode/label"
import { Switch } from "@/components/ui/nightmode/switch"
import { useTheme } from "@/contexts/ThemeContext"

export default function ThemeSwitch() {
  const id = useId()
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <div className="transition-all duration-300 ease-in-out">
      <div className="relative inline-grid h-9 grid-cols-[1fr_1fr] items-center text-sm font-medium transition-all duration-300 ease-in-out">
        <Switch
          id={id}
          checked={isDark}
          onCheckedChange={toggleTheme}
          className="peer absolute inset-0 h-[inherit] w-auto data-[state=checked]:bg-input/50 data-[state=unchecked]:bg-input/50 [&_span]:h-full [&_span]:w-1/2 [&_span]:transition-transform [&_span]:duration-300 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:data-[state=checked]:translate-x-full [&_span]:data-[state=checked]:rtl:-translate-x-full"
        />
        <span className="pointer-events-none relative ms-0.5 flex min-w-8 items-center justify-center text-center peer-data-[state=checked]:text-muted-foreground/70 transition-all duration-300 ease-in-out">
          <MoonIcon size={16} aria-hidden="true" className="transition-all duration-300 ease-in-out" />
        </span>
        <span className="pointer-events-none relative me-0.5 flex min-w-8 items-center justify-center text-center peer-data-[state=unchecked]:text-muted-foreground/70 transition-all duration-300 ease-in-out">
          <SunIcon size={16} aria-hidden="true" className="transition-all duration-300 ease-in-out" />
        </span>
      </div>
      <Label htmlFor={id} className="sr-only">
        Toggle {theme === 'dark' ? 'light' : 'dark'} mode
      </Label>
    </div>
  )
}
