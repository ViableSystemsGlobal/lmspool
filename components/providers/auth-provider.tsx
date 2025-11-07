"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  roles: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialFetchComplete, setInitialFetchComplete] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          if (data.user.roles && Array.isArray(data.user.roles) && data.user.roles.length > 0) {
            setUser(data.user)
          } else {
            console.warn('User has no roles:', data.user)
            setUser(data.user)
          }
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialFetchComplete(true)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!initialFetchComplete || loading) return
    if (!pathname) return

    const isOnSignin = pathname.startsWith('/signin')

    if (!user && !isOnSignin) {
      router.replace('/signin')
    }
  }, [pathname, user, loading, initialFetchComplete, router])

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

