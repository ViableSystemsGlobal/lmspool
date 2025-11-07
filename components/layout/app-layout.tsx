"use client"

import { usePathname } from "next/navigation"
import { MainLayout } from "./main-layout"
import { useAuth } from "@/components/providers/auth-provider"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const userRoles = user?.roles || []
  
  // Don't show layout on auth pages
  if (pathname.startsWith('/signin')) {
    return <>{children}</>
  }
  
  // Show loading state only while actively fetching user data
  // Don't block on empty roles - let the sidebar handle that with its skeleton
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
  
  // If no user after loading completes, show nothing (will redirect to signin)
  if (!user) {
    return null
  }
  
  // Show layout for all other pages
  return (
    <MainLayout userRoles={userRoles}>
      {children}
    </MainLayout>
  )
}
