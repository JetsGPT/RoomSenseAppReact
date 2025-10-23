import { useId } from "react"
import { useLocation } from "react-router-dom"
import { HouseIcon, InboxIcon, SearchIcon, ZapIcon } from "lucide-react"
import Time from "@/components/ui/Time"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import UserMenu from "@/components/user-menu"
import ThemeSwitch from "@/components/ui/ThemeSwitch"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Navigation links array to be used in both desktop and mobile menus
const navigationLinks = [
  { href: "/dashboard", label: "Dashboard", icon: HouseIcon },
  { href: "/about-me", label: "About", icon: InboxIcon },
  { href: "#", label: "Help", icon: ZapIcon },
]

export default function Component() {
  const id = useId()
  const location = useLocation()

  return (
    <header className="border-b px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        
        {/* Left side */}
        <div className="flex flex-1 items-center gap-2">
          {/* Mobile menu trigger */}
          <Popover>
            
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                variant="ghost"
                size="icon"
              >
                <svg
                  className="pointer-events-none"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 12L20 12"
                    className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                  />
                </svg>
              </Button>
            </PopoverTrigger>
            
            <PopoverContent align="start" className="w-36 p-1 md:hidden">
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                  {navigationLinks.map((link, index) => {
                    const Icon = link.icon
                    const isActive = location.pathname === link.href
                    return (
                      <NavigationMenuItem key={index} className="w-full">
                        <NavigationMenuLink
                          href={link.href}
                          className="flex-row items-center gap-2 py-1.5 hover:text-accent-foreground hover:bg-accent/100 data-[active]:bg-accent/60 data-[active]:text-accent-foreground"
                          active={isActive}
                        >
                          <Icon
                            size={16}
                            className={isActive ? "text-accent-foreground" : "text-muted-foreground/80"}
                            aria-hidden="true"
                          />
                          <span>{link.label}</span>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    )
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>
          {/* Logo */}
          <div className="flex items-center">
            <a href="/dashboard" className="text-primary hover:text-primary/90">
              <p>RoomSense</p>
            </a>
          </div>
          By JetsGPT
        </div>
        
        {/* Middle area */}
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList className="gap-2">
            {navigationLinks.map((link, index) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href
              return (
                <NavigationMenuItem key={index}>
                  <NavigationMenuLink
                    active={isActive}
                    href={link.href}
                    className="flex-row items-center gap-2 py-1.5 font-medium text-foreground hover:text-accent-foreground hover:bg-accent/45 data-[active]:bg-accent/60 data-[active]:text-accent-foreground"
                  >
                    <Icon
                      size={16}
                      className={isActive ? "text-accent-foreground" : "text-muted-foreground/80"}
                      aria-hidden="true"
                    />
                    <span>{link.label}</span>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>
        {/* Right side */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="flex items-center gap-3 relative ">
            <ThemeSwitch />
            <Time showSeconds={true}  / >
            <UserMenu />
          </div>
        </div>                                          
      </div>
    </header>
  )
}
