'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

export function NotificationBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications?unreadOnly=true&limit=1')
      const data = await res.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-gray-500 relative"
      onClick={() => router.push('/learn/notifications')}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  )
}

