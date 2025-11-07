'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus, BookOpen, Users, Calendar, AlertCircle, Edit, Trash2, CheckCircle2, Clock, CalendarPlus } from 'lucide-react'
import { CreateAssignmentModal } from '@/components/modals/create-assignment-modal'
import { EditAssignmentModal } from '@/components/modals/edit-assignment-modal'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface Assignment {
  id: string
  courseId: string
  scope: string
  dueAt: string | null
  graceDays: number
  mandatory: boolean
  createdAt: string
  status: 'active' | 'overdue' | 'completed'
  course: {
    id: string
    title: string
    status: string
  } | null
  assignedBy: {
    id: string
    name: string
    email: string
  } | null
  targets: Array<{
    id: string
    userId: string | null
    departmentId: string | null
    user: { id: string; name: string } | null
    department: { id: string; name: string } | null
  }>
  stats: {
    total: number
    completed: number
    started: number
    overdue: number
    notStarted: number
  }
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [extendDays, setExtendDays] = useState<string>('7')
  const [metrics, setMetrics] = useState({
    active: 0,
    total: 0,
    overdue: 0,
  })

  const fetchAssignments = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') {
      params.append('status', statusFilter)
    }
    
    fetch(`/api/assignments?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const fetchedAssignments = data.assignments || []
        setAssignments(fetchedAssignments)
        
        // Calculate metrics
        const active = fetchedAssignments.filter((a: Assignment) => a.status === 'active').length
        const overdue = fetchedAssignments.filter((a: Assignment) => a.status === 'overdue').length
        const total = fetchedAssignments.reduce((sum: number, a: Assignment) => sum + a.stats.total, 0)
        
        setMetrics({ active, total, overdue })
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching assignments:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAssignments()
  }, [statusFilter])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(assignments.map(a => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectAssignment = (assignmentId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(assignmentId)
    } else {
      newSelected.delete(assignmentId)
    }
    setSelectedIds(newSelected)
  }

  const handleEdit = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAssignment(assignment)
    setEditModalOpen(true)
  }

  const handleDelete = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this assignment? This will not remove enrollments.')) return

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to delete assignment: ${data.error || 'Unknown error'}`)
        return
      }

      fetchAssignments()
    } catch (err) {
      console.error('Delete assignment error:', err)
      alert('An error occurred. Please try again.')
    }
  }

  const handleAssignmentUpdated = () => {
    fetchAssignments()
    setEditModalOpen(false)
    setSelectedAssignment(null)
  }

  const handleBulkAction = async (action: 'delete' | 'extend') => {
    if (selectedIds.size === 0) return

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.size} assignment(s)?`)) {
      return
    }

    if (action === 'extend') {
      const days = parseInt(extendDays)
      if (!days || days <= 0) {
        alert('Please enter a valid number of days')
        return
      }
      if (!confirm(`Extend due date by ${days} days for ${selectedIds.size} assignment(s)?`)) {
        return
      }
    }

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentIds: Array.from(selectedIds),
          action,
          extendDays: action === 'extend' ? parseInt(extendDays) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to ${action} assignments: ${data.error || 'Unknown error'}`)
        setBulkActionLoading(false)
        return
      }

      // Refresh assignments and clear selection
      fetchAssignments()
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Bulk action error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const allSelected = assignments.length > 0 && selectedIds.size === assignments.length

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const getScopeDisplay = (assignment: Assignment) => {
    if (assignment.scope === 'all') return 'All Users'
    if (assignment.scope === 'department') {
      const deptNames = assignment.targets
        .filter(t => t.department)
        .map(t => t.department?.name)
        .filter(Boolean)
        .join(', ')
      return deptNames || 'Department(s)'
    }
    if (assignment.scope === 'user') {
      const userNames = assignment.targets
        .filter(t => t.user)
        .map(t => t.user?.name)
        .filter(Boolean)
        .join(', ')
      return userNames || `${assignment.stats.total} User(s)`
    }
    return assignment.scope
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Assignments</h1>
          <p className="text-gray-600 mt-1">Assign courses to users and departments</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-orange-600" />
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? <Skeleton className="h-8 w-16" /> : metrics.active}
            </div>
            <p className="text-xs text-gray-500 mt-1">Courses assigned to users</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-600" />
              Total Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? <Skeleton className="h-8 w-16" /> : metrics.total}
            </div>
            <p className="text-xs text-gray-500 mt-1">Users with assignments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? <Skeleton className="h-8 w-16" /> : metrics.overdue}
            </div>
            <p className="text-xs text-gray-500 mt-1">Assignments past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.size} assignment{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkActionLoading}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              {selectedIds.size > 0 && (
                <div className="flex items-center space-x-2 mr-4">
                  <Input
                    type="number"
                    min="1"
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    className="w-20"
                    placeholder="Days"
                    disabled={bulkActionLoading}
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('extend')}
                disabled={bulkActionLoading}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Extend Due Date
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        {assignments.length > 0 && (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => handleSelectAll(!allSelected)}>
              Select all ({assignments.length})
            </label>
          </div>
        )}
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-0 shadow-sm">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first assignment to assign courses to users</p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card 
              key={assignment.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Checkbox
                        checked={selectedIds.has(assignment.id)}
                        onCheckedChange={(checked) => handleSelectAssignment(assignment.id, checked === true)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {assignment.course?.title || 'Unknown Course'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Assigned to: {getScopeDisplay(assignment)}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(assignment.status)}`}>
                      {assignment.status}
                    </span>
                    {assignment.mandatory && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        Mandatory
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEdit(assignment, e)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(assignment.id, e)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <div>
                      <div className="font-medium">Due Date</div>
                      <div className="text-gray-500">{formatDate(assignment.dueAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    <div>
                      <div className="font-medium">Total</div>
                      <div className="text-gray-500">{assignment.stats.total} assigned</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    <div>
                      <div className="font-medium">Completed</div>
                      <div className="text-gray-500">{assignment.stats.completed} / {assignment.stats.total}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                    <div>
                      <div className="font-medium">In Progress</div>
                      <div className="text-gray-500">{assignment.stats.started} started</div>
                    </div>
                  </div>
                </div>
                {assignment.stats.overdue > 0 && (
                  <div className="mt-4 flex items-center text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>{assignment.stats.overdue} user(s) overdue</span>
                  </div>
                )}
                {assignment.assignedBy && (
                  <div className="mt-4 text-xs text-gray-500">
                    Assigned by {assignment.assignedBy.name} on {formatDate(assignment.createdAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open)
          if (!open) {
            fetchAssignments()
          }
        }}
        onSuccess={fetchAssignments}
      />

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            setSelectedAssignment(null)
          }
        }}
        assignment={selectedAssignment}
        onUpdated={handleAssignmentUpdated}
      />
    </div>
  )
}
