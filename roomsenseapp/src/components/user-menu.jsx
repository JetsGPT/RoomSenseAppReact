import {
  LogOutIcon,
  Shield,
  Monitor,
  Info,
  Settings,
  User,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useSidebar } from "@/shared/contexts/SidebarContext"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function UserMenu() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { setActiveView } = useSidebar();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-accent rounded-full">
          <Avatar className="h-7 w-7">
            <AvatarImage src="." alt="Profile image" />
            <AvatarFallback className="text-xs">{user?.username?.slice(0, 2)?.toUpperCase() || 'RS'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {user?.username}
          </span>
          <span className={`truncate text-xs font-normal ${
            user?.role === "admin" ? "text-red-500" : "text-muted-foreground"
          }`}>
            Role: {user?.role?.toUpperCase() || 'User'}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate('/admin')}>
            <Shield size={16} className="opacity-60 mr-2" aria-hidden="true" />
            <span>Admin Panel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/kiosk')}>
            <Monitor size={16} className="opacity-60 mr-2" aria-hidden="true" />
            <span>Kiosk Mode</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/about-me')}>
            <Info size={16} className="opacity-60 mr-2" aria-hidden="true" />
            <span>About</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => {
            navigate('/dashboard?view=options');
            setActiveView('options');
          }}>
            <Settings size={16} className="opacity-60 mr-2" aria-hidden="true" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOutIcon size={16} className="opacity-60 mr-2" aria-hidden="true" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}