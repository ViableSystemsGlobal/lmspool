"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "@/contexts/theme-context"
import { Search, HelpCircle, User, LogOut, Menu } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useState, useEffect } from "react"

interface User {
  name: string;
  email: string;
  roles: string[];
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { getThemeClasses, getThemeColor } = useTheme()
  const theme = getThemeClasses()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-gray-500"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Search - hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search courses, users..."
            className="w-64 lg:w-80 pl-10 h-9 border-gray-200"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <NotificationBell />
        
        {/* Help button - hidden on mobile */}
        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 text-gray-500">
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* User info - simplified on mobile */}
        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-gray-200">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(to bottom right, ${getThemeColor()}, ${getThemeColor()}dd)`
            }}
          >
            <span className="text-white text-sm font-medium">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
            </span>
          </div>
          {/* User name and role - hidden on mobile */}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500">
              {user?.roles?.join(', ') || "Learner"}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            onClick={async () => {
              try {
                const res = await fetch('/api/auth/logout', {
                  method: 'POST',
                })
                if (res.ok) {
                  // Redirect to signin - the API already redirects but we can also do it client-side
                  window.location.href = '/signin'
                } else {
                  // If API redirect fails, redirect manually
                  window.location.href = '/signin'
                }
              } catch (error) {
                console.error('Logout error:', error)
                // Redirect anyway
                window.location.href = '/signin'
              }
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
