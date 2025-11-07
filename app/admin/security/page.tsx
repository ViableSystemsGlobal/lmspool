'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

interface SecurityEvent {
  id: string
  eventType: string
  description: string
  detectedAt: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolvedAt: string | null
  resolutionNotes: string | null
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unresolved: 0,
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/security-events?limit=100')
      const data = await res.json()
      setEvents(data.events || [])
      
      // Calculate stats
      const total = data.events?.length || 0
      const critical = data.events?.filter((e: SecurityEvent) => e.severity === 'critical' && !e.resolvedAt).length || 0
      const high = data.events?.filter((e: SecurityEvent) => e.severity === 'high' && !e.resolvedAt).length || 0
      const medium = data.events?.filter((e: SecurityEvent) => e.severity === 'medium' && !e.resolvedAt).length || 0
      const low = data.events?.filter((e: SecurityEvent) => e.severity === 'low' && !e.resolvedAt).length || 0
      const unresolved = data.events?.filter((e: SecurityEvent) => !e.resolvedAt).length || 0
      
      setStats({ total, critical, high, medium, low, unresolved })
    } catch (err) {
      console.error('Error fetching security events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (eventId: string) => {
    try {
      const res = await fetch(`/api/security-events/${eventId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: 'Resolved by admin' }),
      })
      
      if (res.ok) {
        fetchEvents()
      }
    } catch (err) {
      console.error('Error resolving event:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'low':
        return <Shield className="h-5 w-5 text-blue-600" />
      default:
        return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Security Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor security events and system health</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Critical</CardTitle>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                <p className="text-xs text-gray-500 mt-1">Unresolved</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
                <p className="text-xs text-gray-500 mt-1">Unresolved</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Medium</CardTitle>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
                <p className="text-xs text-gray-500 mt-1">Unresolved</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
                <p className="text-xs text-gray-500 mt-1">Unresolved</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unresolved</CardTitle>
            <div className="p-2 bg-gray-50 rounded-lg">
              <Clock className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.unresolved}</div>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>Monitor and resolve security events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No security events</h3>
              <p className="text-gray-500 text-sm">All clear! No security events detected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 border rounded-lg ${getSeverityColor(event.severity)} ${
                    event.resolvedAt ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(event.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{event.eventType}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium border">
                            {event.severity}
                          </span>
                          {event.resolvedAt && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2">{event.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>{new Date(event.detectedAt).toLocaleString()}</span>
                          {event.resolvedAt && (
                            <span>Resolved: {new Date(event.resolvedAt).toLocaleString()}</span>
                          )}
                        </div>
                        {event.resolutionNotes && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            Resolution: {event.resolutionNotes}
                          </p>
                        )}
                      </div>
                    </div>
                    {!event.resolvedAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(event.id)}
                        className="ml-4"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

