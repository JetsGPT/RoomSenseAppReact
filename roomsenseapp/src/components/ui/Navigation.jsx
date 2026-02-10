import { useId, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { HouseIcon, InboxIcon, SearchIcon, ZapIcon, Shield, Box, BarChart3, Download, Monitor, Map, CloudSun, GitCompareArrows } from "lucide-react"
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
import { useSidebar } from "@/shared/contexts/SidebarContext"

// Navigation links array to be used in both desktop and mobile menus
const navigationLinks = [
  { href: "/dashboard", label: "Dashboard", icon: HouseIcon },
  { href: "/floor-plan", label: "Floor Plan", icon: Map },
  { href: "/boxes", label: "My Boxes", icon: Box },
  { href: "/weather", label: "Weather", icon: CloudSun },
  { href: "/correlation", label: "Correlation", icon: GitCompareArrows },
  { href: "/kiosk", label: "Kiosk", icon: Monitor },
  { href: "/download", label: "Download", icon: Download },
  { href: "/about-me", label: "About", icon: InboxIcon },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "#", label: "Help", icon: ZapIcon },
]

export default function Component() {
  const id = useId()
  const location = useLocation()
  const navigate = useNavigate()
  const { activeView, setActiveView, sensorBoxes } = useSidebar()
  const [open, setOpen] = useState(false)

  const handleLinkClick = (href) => {
    navigate(href)
    setOpen(false)
  }

  const handleViewClick = (viewId) => {
    setActiveView(viewId)
    setOpen(false)
  }

  return (
    <header className="border-b px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">

        {/* Left side */}
        <div className="flex items-center gap-2">
          {/* Mobile menu trigger */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                className="group size-10 md:hidden border border-border/50 hover:border-border"
                variant="ghost"
                size="icon"
                title="Navigation Menu"
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

            <PopoverContent align="start" className="w-72 p-3 md:hidden">
              <div className="space-y-4">
                {/* Navigation Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Navigation
                  </h3>
                  <div className="space-y-1">
                    {navigationLinks.map((link, index) => {
                      const Icon = link.icon
                      const isActive = location.pathname === link.href
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className="w-full justify-start py-2.5 px-3 h-auto"
                            onClick={() => handleLinkClick(link.href)}
                          >
                            <Icon
                              size={18}
                              className="mr-3"
                              aria-hidden="true"
                            />
                            <span className="font-medium">{link.label}</span>
                          </Button>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Dashboard Views Section - Only show on dashboard page */}
                {location.pathname === '/dashboard' && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Dashboard Views
                    </h3>
                    <div className="space-y-1">
                      {/* Overview */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        <Button
                          variant={activeView === 'overview' ? "default" : "ghost"}
                          className="w-full justify-start py-2.5 px-3 h-auto"
                          onClick={() => handleViewClick('overview')}
                        >
                          <HouseIcon size={18} className="mr-3" />
                          <span className="font-medium">Overview</span>
                        </Button>
                      </motion.div>

                      {/* Sensor Boxes */}
                      {sensorBoxes.map((boxId, index) => (
                        <motion.div
                          key={boxId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0.1 + (index + 1) * 0.05 }}
                        >
                          <Button
                            variant={activeView === `box - ${boxId} ` ? "default" : "ghost"}
                            className="w-full justify-start py-2.5 px-3 h-auto"
                            onClick={() => handleViewClick(`box-${boxId}`)}
                          >
                            <Box size={18} className="mr-3" />
                            <span className="font-medium">Box {boxId}</span>
                          </Button>
                        </motion.div>
                      ))}

                      {/* Analytics */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 + (sensorBoxes.length + 1) * 0.05 }}
                      >
                        <Button
                          variant={activeView === 'analytics' ? "default" : "ghost"}
                          className="w-full justify-start py-2.5 px-3 h-auto"
                          onClick={() => handleViewClick('analytics')}
                        >
                          <BarChart3 size={18} className="mr-3" />
                          <span className="font-medium">Analytics</span>
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-primary hover:text-primary/90">
              <p className="font-semibold">RoomSense</p>
            </Link>
            <span className="hidden sm:inline text-xs text-muted-foreground">By JetsGPT</span>
          </div>
        </div>

        {/* Middle area */}
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList className="gap-2">
            {navigationLinks.map((link, index) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href
              return (
                <NavigationMenuItem key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <NavigationMenuLink
                      asChild
                      active={isActive}
                      className="flex-row items-center gap-2 py-1.5 font-medium text-foreground hover:text-accent-foreground hover:bg-accent/45 data-[active]:bg-accent/60 data-[active]:text-accent-foreground"
                    >
                      <Link to={link.href}>
                        <Icon
                          size={16}
                          className={isActive ? "text-accent-foreground" : "text-muted-foreground/80"}
                          aria-hidden="true"
                        />
                        <span>{link.label}</span>
                      </Link>
                    </NavigationMenuLink>
                  </motion.div>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>
        {/* Right side */}
        <motion.div
          className="flex items-center justify-end gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 relative ">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ThemeSwitch />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="hidden md:block"
            >
              <Time showSeconds={true} />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <UserMenu />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </header>
  )
}
