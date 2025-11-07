'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, Building, Shield, Mail, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import { CreateUserModal } from '@/components/modals/create-user-modal'
import { EditUserModal } from '@/components/modals/edit-user-modal'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  jobTitle: string | null
  employeeCode: string | null
  departmentId: string | null
  department: {
    id: string
    name: string
  } | null
  roles: Array<{
    role: {
      id: number
      name: string
    }
  }>
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    fetch('/api/users?status=all') // Fetch all users (active and inactive)
      .then(res => res.json())
      .then(data => {
        console.log('Fetched users:', data.users?.length || 0)
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching users:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUserUpdated = () => {
    fetchUsers()
    setEditModalOpen(false)
    setSelectedUser(null)
  }

  const handleEdit = (user: User, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleDelete = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to delete user: ${data.error || 'Unknown error'}`)
        return
      }

      fetchUsers()
    } catch (err) {
      console.error('Delete user error:', err)
      alert('An error occurred. Please try again.')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(users.map(u => u.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.size === 0) return

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.size} user(s)? This action cannot be undone.`)) {
      return
    }

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to ${action} users: ${data.error || 'Unknown error'}`)
        setBulkActionLoading(false)
        return
      }

      // Refresh users and clear selection
      fetchUsers()
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Bulk action error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const allSelected = users.length > 0 && selectedIds.size === users.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < users.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage users and their roles</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.size} user{selectedIds.size !== 1 ? 's' : ''} selected
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
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
                disabled={bulkActionLoading}
                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
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

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'user' : 'users'} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
              <p className="text-gray-500 text-sm mb-4">Start by adding your first user</p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          ) : (
            <>
              {/* Select All Checkbox */}
              {users.length > 0 && (
                <div className="flex items-center space-x-2 pb-2 mb-4">
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
                    Select all ({users.length})
                  </label>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked === true)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-orange-600">
                                {user.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.department ? (
                            <div className="flex items-center text-sm text-gray-500">
                              <Building className="h-4 w-4 mr-2 text-gray-400" />
                              {user.department.name}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {r.role.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleEdit(user, e)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(user.id, e)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open)
          if (!open) {
            fetchUsers()
          }
        }}
        onSuccess={fetchUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            setSelectedUser(null)
          }
        }}
        user={selectedUser}
        onUpdated={handleUserUpdated}
      />
    </div>
  )
}
