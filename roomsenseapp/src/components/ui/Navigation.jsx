import { useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  HouseIcon, Bell, Download, Menu, X,
  Box, Home, Map, BarChart3, CloudSun, GitCompareArrows,
  Calendar, Activity, Settings
} from "lucide-react"
import Time from "@/components/ui/Time"
import { Button } from "@/components/ui/button"
import UserMenu from "@/components/user-menu"
import ThemeSwitch from "@/components/ui/ThemeSwitch"
import { useSidebar } from "@/shared/contexts/SidebarContext"
import { Badge } from "@/components/ui/badge"

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleCollapsed, isCollapsed, notificationCount } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Mobile nav items (mirrors sidebar for mobile)
  const mobileNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard?view=overview", label: "Sensors", icon: Box, isView: true },
    { href: "/boxes", label: "Box Management", icon: Box },
    { href: "/floor-plan", label: "Floor Plan", icon: Map },
    { href: "/dashboard?view=heatmap", label: "Heatmap", icon: Calendar, isView: true },
    { href: "/dashboard?view=correlation", label: "Correlation", icon: GitCompareArrows, isView: true },
    { href: "/weather", label: "Weather", icon: CloudSun },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/system-health", label: "System Health", icon: Activity },
  ]

  const handleMobileNav = (item) => {
    if (item.isView) {
      navigate(item.href)
    } else {
      navigate(item.href)
    }
    setMobileOpen(false)
  }

  return (
    <>
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex h-12 items-center justify-between px-3 md:px-4">

          {/* Left side: Sidebar toggle + Logo */}
          <div className="flex items-center gap-2">
            {/* Sidebar collapse toggle (desktop) */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8"
              onClick={toggleCollapsed}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={18} />
            </Button>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="font-semibold text-sm text-foreground">RoomSense</span>
              <span className="hidden sm:inline text-[10px] text-muted-foreground font-medium">By JetsGPT</span>
            </Link>
          </div>

          {/* Right side: Utility icons */}
          <motion.div
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
              onClick={() => navigate('/notifications')}
              title="Notifications"
            >
              <Bell size={16} className={location.pathname === '/notifications' ? 'text-primary' : 'text-muted-foreground'} />
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/download')}
              title="Download Data"
            >
              <Download size={16} className={location.pathname === '/download' ? 'text-primary' : 'text-muted-foreground'} />
            </Button>

            {/* Theme toggle */}
            <ThemeSwitch />

            {/* Time (desktop only) */}
            <div className="hidden md:block text-xs text-muted-foreground tabular-nums px-1">
              <Time showSeconds={true} />
            </div>

            {/* User menu */}
            <UserMenu />
          </motion.div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <motion.div
          className="fixed inset-0 z-40 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <motion.nav
            className="absolute left-0 top-12 bottom-0 w-72 bg-card border-r border-border shadow-xl overflow-y-auto"
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="p-3 space-y-1">
              {mobileNavItems.map((item, index) => {
                const Icon = item.icon
                const isActive = item.isView
                  ? location.search.includes(`view=${item.href.split('view=')[1]}`)
                  : location.pathname === item.href
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start h-10 px-3 text-sm"
                      onClick={() => handleMobileNav(item)}
                    >
                      <Icon size={16} className="mr-2.5" />
                      {item.label}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </motion.nav>
        </motion.div>
      )}
    </>
  )
}
