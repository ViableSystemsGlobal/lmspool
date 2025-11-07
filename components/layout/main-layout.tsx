"use client"

import { useState, useEffect, memo } from "react"
import Sidebar from "./sidebar"
import { Header } from "./header"

interface MainLayoutProps {
  children: React.ReactNode
  userRoles: string[]
}

// Memoize Sidebar to prevent re-renders
const MemoizedSidebar = memo(Sidebar);
// Memoize Header to prevent re-renders
const MemoizedHeader = memo(Header);

export function MainLayout({ children, userRoles }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <MemoizedSidebar userRoles={userRoles} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto">
        <MemoizedHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

