import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Box, Settings } from 'lucide-react';
import { useSidebar } from '@/shared/contexts/SidebarContext';
import { motion } from 'framer-motion';

export function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { activeView, setActiveView } = useSidebar();

    // Define routes where BottomNav should NOT be shown
    const hideNavigationRoutes = ['/login', '/unauthorized', '/kiosk'];
    if (hideNavigationRoutes.includes(location.pathname)) {
        return null;
    }

    // Handlers for navigation
    const handleNavigation = (route, view) => {
        if (location.pathname !== route) {
            navigate(route);
        }
        if (view) {
            setActiveView(view);
        }
    };

    const navItems = [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            route: '/dashboard',
            view: 'overview',
            isActive: location.pathname === '/dashboard' && activeView !== 'options'
        },
        {
            id: 'devices',
            label: 'Devices',
            icon: Box,
            route: '/boxes',
            view: null,
            isActive: location.pathname === '/boxes'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            route: '/dashboard',
            view: 'options',
            isActive: location.pathname === '/dashboard' && activeView === 'options'
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe pt-1 px-2 flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))]">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.isActive;

                return (
                    <button
                        key={item.id}
                        onClick={() => handleNavigation(item.route, item.view)}
                        className={`relative flex flex-col items-center justify-center w-full h-14 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="bottomNavIndicator"
                                className="absolute -top-1 w-12 h-1 bg-primary rounded-full transition-all duration-300"
                            />
                        )}
                        <Icon
                            size={22}
                            strokeWidth={isActive ? 2.5 : 2}
                            className={`transition-all duration-300 ${isActive ? 'scale-110 mb-1' : 'scale-100 mb-1'}`}
                        />
                        <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default BottomNav;
