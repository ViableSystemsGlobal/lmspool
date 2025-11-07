"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/theme-context";
import { SkeletonSidebar } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building,
  FileText,
  BarChart3,
  Settings,
  Users2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  GraduationCap,
  FileSpreadsheet,
  Shield,
} from "lucide-react";

const navigation = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
  },
  { 
    name: "Courses", 
    href: "/admin/courses", 
    icon: BookOpen,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "Users", 
    href: "/admin/users", 
    icon: Users,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "Departments", 
    href: "/admin/departments", 
    icon: Building,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "Assignments", 
    href: "/admin/assignments", 
    icon: FileText,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "Analytics", 
    href: "/admin/analytics", 
    icon: BarChart3,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "Reports", 
    href: "/admin/reports", 
    icon: FileSpreadsheet,
    roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER']
  },
  { 
    name: "Audit Logs", 
    href: "/admin/audit-logs", 
    icon: FileText,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "Security", 
    href: "/admin/security", 
    icon: Shield,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "My Team", 
    href: "/manager/team", 
    icon: Users2,
    roles: ['MANAGER', 'ADMIN', 'SUPER_ADMIN']
  },
  { 
    name: "My Learning", 
    href: "/learn/dashboard", 
    icon: GraduationCap,
  },
  { 
    name: "Settings", 
    href: "/admin/settings", 
    icon: Settings,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
];

export default function Sidebar({ userRoles, onClose }: { userRoles: string[]; onClose?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { getThemeClasses, customLogo, getThemeColor } = useTheme();
  const theme = getThemeClasses();
  const [logo, setLogo] = useState<string | null>(customLogo);
  const [themeColor, setThemeColor] = useState<string>(getThemeColor());

  // Listen for branding updates
  useEffect(() => {
    setLogo(customLogo);
    setThemeColor(getThemeColor());
    
    const handleBrandingUpdate = () => {
      // Small delay to ensure context has updated
      setTimeout(() => {
        setLogo(customLogo);
        setThemeColor(getThemeColor());
      }, 100);
    };
    
    window.addEventListener('brandingUpdated', handleBrandingUpdate);
    return () => {
      window.removeEventListener('brandingUpdated', handleBrandingUpdate);
    };
  }, [customLogo, getThemeColor]);

  // Debug: Log user roles in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sidebar - User Roles:', userRoles);
      console.log('Sidebar - Total navigation items:', navigation.length);
    }
  }, [userRoles]);

  // Show skeleton only if userRoles is empty or not yet loaded
  // AppLayout already handles the loading state, so we just need to check if roles are available
  if (!userRoles || userRoles.length === 0) {
    return <SkeletonSidebar />;
  }

  // Check if user has required role
  const hasRole = (requiredRoles?: string[]) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.some(role => userRoles.includes(role));
  };

  // Filter navigation based on roles
  const filteredNavigation = navigation.filter(item => hasRole(item.roles));

  // Helper function to get proper background classes
  const getBackgroundClasses = (isActive: boolean) => {
    const colorMap: { [key: string]: string } = {
      'purple-600': 'bg-purple-600',
      'blue-600': 'bg-blue-600',
      'green-600': 'bg-green-600',
      'orange-600': 'bg-orange-600',
      'red-600': 'bg-red-600',
      'indigo-600': 'bg-indigo-600',
      'pink-600': 'bg-pink-600',
      'teal-600': 'bg-teal-600',
    };
    return colorMap[theme.primary] || 'bg-orange-600';
  };

  // Helper function to get hover background classes
  const getHoverBackgroundClasses = () => {
    const colorMap: { [key: string]: string } = {
      'purple-600': 'hover:bg-purple-600',
      'blue-600': 'hover:bg-blue-600', 
      'green-600': 'hover:bg-green-600',
      'orange-600': 'hover:bg-orange-600',
      'red-600': 'hover:bg-red-600',
      'indigo-600': 'hover:bg-indigo-600',
      'pink-600': 'hover:bg-pink-600',
      'teal-600': 'hover:bg-teal-600',
    };
    return colorMap[theme.primary] || 'hover:bg-orange-600';
  };

  // Helper function to get proper text color classes
  const getTextColorClasses = () => {
    const colorMap: { [key: string]: string } = {
      'purple-600': 'text-purple-600',
      'blue-600': 'text-blue-600',
      'green-600': 'text-green-600',
      'orange-600': 'text-orange-600',
      'red-600': 'text-red-600',
      'indigo-600': 'text-indigo-600',
      'pink-600': 'text-pink-600',
      'teal-600': 'text-teal-600',
    };
    return colorMap[theme.primary] || 'text-orange-600';
  };

  // Helper function to get proper gradient background classes
  const getGradientBackgroundClasses = () => {
    const colorMap: { [key: string]: string } = {
      'purple-600': 'bg-gradient-to-br from-purple-600 to-purple-700',
      'blue-600': 'bg-gradient-to-br from-blue-600 to-blue-700',
      'green-600': 'bg-gradient-to-br from-green-600 to-green-700',
      'orange-600': 'bg-gradient-to-br from-orange-600 to-orange-700',
      'red-600': 'bg-gradient-to-br from-red-600 to-red-700',
      'indigo-600': 'bg-gradient-to-br from-indigo-600 to-indigo-700',
      'pink-600': 'bg-gradient-to-br from-pink-600 to-pink-700',
      'teal-600': 'bg-gradient-to-br from-teal-600 to-teal-700',
    };
    return colorMap[theme.primary] || 'bg-gradient-to-br from-orange-600 to-orange-700';
  };

  // Get actual theme color for inline styles
  const themeColorHex = themeColor || getThemeColor();

  const isActive = (href: string) => {
    if (pathname === href) return true;
    // For exact matches, only match if it's the exact path
    if (pathname.startsWith(href + "/")) {
      return false;
    }
    return false;
  };

  return (
    <div className={cn(
      "flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-200",
      collapsed ? "w-16" : "w-64",
      "lg:w-auto" // Mobile: full width, Desktop: auto width
    )}>
      {/* Header */}
      <div className="flex h-20 items-center justify-between border-b border-gray-200 px-2 lg:justify-center">
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {logo ? (
          <img 
            src={logo} 
            alt="Logo" 
            className="h-16 w-auto max-w-full rounded-lg object-contain"
          />
        ) : (
          <div 
            className="h-16 w-16 rounded-lg flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(to bottom right, ${themeColorHex}, ${themeColorHex}dd)`
            }}
          >
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        {filteredNavigation.map((item) => {
          const isActiveItem = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                // Close sidebar on mobile when link is clicked
                if (onClose && window.innerWidth < 1024) {
                  onClose()
                }
              }}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                isActiveItem
                  ? "text-white"
                  : "text-gray-700 hover:text-white"
              )}
              style={
                isActiveItem
                  ? {
                      backgroundColor: themeColorHex,
                      color: '#ffffff'
                    }
                  : {
                      color: '#374151'
                    }
              }
              onMouseEnter={(e) => {
                if (!isActiveItem) {
                  e.currentTarget.style.backgroundColor = themeColorHex + '20'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveItem) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {!collapsed && (
          <>
            {/* Help */}
            <button 
              className="flex items-center w-full text-sm text-gray-500 transition-colors"
              style={{ color: '#6b7280' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = getThemeColor();
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280';
              }}
              onClick={() => {
                alert('Help & Keyboard shortcuts coming soon!');
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Keyboard shortcuts
            </button>
          </>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>
    </div>
  );
}

