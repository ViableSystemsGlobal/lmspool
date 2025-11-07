'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Download, Search, Filter, ChevronLeft, ChevronRight, Eye, User, Calendar, Tag } from 'lucide-react'

interface AuditLog {
  id: string
  actorUserId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  ip: string | null
  userAgent: string | null
  ts: string
  meta: Record<string, any>
  changedFields: Record<string, { before: any; after: any }> | null
  actorUser: {
    id: string
    name: string
    email: string
  } | null
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  // Filters
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, userId, action, entityType, dateFrom, dateTo])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })
      
      if (userId) params.append('userId', userId)
      if (action) params.append('action', action)
      if (entityType) params.append('entityType', entityType)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const res = await fetch(`/api/audit-logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (userId) params.append('userId', userId)
    if (action) params.append('action', action)
    if (entityType) params.append('entityType', entityType)
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    params.append('limit', '10000') // Export all

    window.location.href = `/api/audit-logs/export?${params}`
  }

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('assign')) return 'bg-green-100 text-green-700'
    if (action.includes('update') || action.includes('modify')) return 'bg-blue-100 text-blue-700'
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-700'
    if (action.includes('login') || action.includes('auth')) return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">View and search all system activity logs</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <Input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value)
                  setPage(1)
                }}
                placeholder="Filter by user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <Input
                type="text"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value)
                  setPage(1)
                }}
                placeholder="e.g., create, update, delete"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
              <Input
                type="text"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value)
                  setPage(1)
                }}
                placeholder="e.g., course, user, assignment"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setUserId('')
                setAction('')
                setEntityType('')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${total} total logs • Page ${page} of ${totalPages}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.ts).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.actorUser ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{log.actorUser.name}</div>
                              <div className="text-xs text-gray-500">{log.actorUser.email}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">System</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.entityType ? (
                            <div>
                              <div className="font-medium">{log.entityType}</div>
                              {log.entityId && <div className="text-xs text-gray-400">ID: {log.entityId}</div>}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} logs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit Log Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(selectedLog.ts).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">User</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.actorUser ? `${selectedLog.actorUser.name} (${selectedLog.actorUser.email})` : 'System'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Action</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity Type</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.entityType || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.ip || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">User Agent</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.userAgent || '-'}</p>
                </div>
              </div>

              {selectedLog.changedFields && Object.keys(selectedLog.changedFields).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Changed Fields</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Before</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">After</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(selectedLog.changedFields).map(([field, values]) => (
                          <tr key={field}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{field}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {typeof values.before === 'object' ? JSON.stringify(values.before) : String(values.before)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {typeof values.after === 'object' ? JSON.stringify(values.after) : String(values.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Metadata</label>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

