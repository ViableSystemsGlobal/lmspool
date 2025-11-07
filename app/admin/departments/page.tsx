'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Building, Plus, Users, UserCheck, Hash, Edit, Trash2 } from 'lucide-react'
import { CreateDepartmentModal } from '@/components/modals/create-department-modal'
import { EditDepartmentModal } from '@/components/modals/edit-department-modal'

interface Department {
  id: string
  name: string
  code: string | null
  parentId: string | null
  managerUserId: string | null
  manager: {
    id: string
    name: string
    email: string
  } | null
  parent: {
    id: string
    name: string
  } | null
  _count: {
    members: number
  }
}

export default function DepartmentsPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const fetchDepartments = () => {
    setLoading(true)
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => {
        setDepartments(data.departments || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching departments:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const handleDepartmentUpdated = () => {
    fetchDepartments()
    setEditModalOpen(false)
    setSelectedDepartment(null)
  }

  const handleEdit = (department: Department, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDepartment(department)
    setEditModalOpen(true)
  }

  const handleDelete = async (departmentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this department?')) return

    try {
      const response = await fetch(`/api/departments/${departmentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to delete department: ${data.error || 'Unknown error'}`)
        return
      }

      fetchDepartments()
    } catch (err) {
      console.error('Delete department error:', err)
      alert('An error occurred. Please try again.')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(departments.map(d => d.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectDepartment = (departmentId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(departmentId)
    } else {
      newSelected.delete(departmentId)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkAction = async (action: 'delete') => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/departments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentIds: Array.from(selectedIds),
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to ${action} departments: ${data.error || 'Unknown error'}`)
        setBulkActionLoading(false)
        return
      }

      // Refresh departments and clear selection
      fetchDepartments()
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Bulk action error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const allSelected = departments.length > 0 && selectedIds.size === departments.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < departments.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Departments</h1>
          <p className="text-gray-600 mt-1">Organize your company structure</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Department
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.size} department{selectedIds.size !== 1 ? 's' : ''} selected
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedIds.size} department(s)?`)) {
                    handleBulkAction('delete')
                  }
                }}
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

      {/* Departments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
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
      ) : departments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first department to organize users</p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select All Checkbox */}
          {departments.length > 0 && (
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault()
                    handleSelectAll(!allSelected)
                  }
                }}
              />
              <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => handleSelectAll(!allSelected)}>
                Select all ({departments.length})
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <Card 
                key={dept.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
              >
                {/* Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedIds.has(dept.id)}
                    onCheckedChange={(checked) => handleSelectDepartment(dept.id, checked === true)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Clickable area */}
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/departments/${dept.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Building className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {dept.name}
                    </CardTitle>
                    {dept.code && (
                      <CardDescription className="flex items-center mt-1">
                        <Hash className="h-3 w-3 mr-1" />
                        {dept.code}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dept.manager && (
                        <div className="flex items-center text-sm text-gray-600">
                          <UserCheck className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{dept.manager.name}</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-500">Manager</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{dept._count.members} {dept._count.members === 1 ? 'member' : 'members'}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 z-10 flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleEdit(dept, e)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(dept.id, e)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Department Modal */}
      <CreateDepartmentModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open)
          if (!open) {
            fetchDepartments()
          }
        }}
        onSuccess={fetchDepartments}
      />

      {/* Edit Department Modal */}
      <EditDepartmentModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            setSelectedDepartment(null)
          }
        }}
        department={selectedDepartment}
        onUpdated={handleDepartmentUpdated}
      />
    </div>
  )
}
