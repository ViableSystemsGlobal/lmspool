'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface CreateDepartmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface Department {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

export function CreateDepartmentModal({ open, onOpenChange, onSuccess }: CreateDepartmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parentId: '',
    managerUserId: '',
  })

  useEffect(() => {
    if (open) {
      // Fetch departments and users
      Promise.all([
        fetch('/api/departments').then(res => res.json()),
        fetch('/api/users').then(res => res.json())
      ])
        .then(([deptData, userData]) => {
          setDepartments(deptData.departments || [])
          setUsers(userData.users || [])
          setLoadingData(false)
        })
        .catch(err => {
          console.error('Error fetching data:', err)
          setLoadingData(false)
        })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code || undefined,
          parentId: formData.parentId || undefined,
          managerUserId: formData.managerUserId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create department')
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      onOpenChange(false)
      setFormData({
        name: '',
        code: '',
        parentId: '',
        managerUserId: '',
      })
      onSuccess?.()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Department</DialogTitle>
          <DialogDescription>
            Create a new department. You can assign a manager and set a parent department.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Sales, Engineering, HR..."
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="code">Department Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="SALES, ENG, HR"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="parentId">Parent Department</Label>
              {loadingData ? (
                <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
              ) : (
                <Select
                  id="parentId"
                  value={formData.parentId}
                  onChange={(e) => handleChange('parentId', e.target.value)}
                  disabled={loading}
                >
                  <option value="">None (Top-level department)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="managerUserId">Manager</Label>
              {loadingData ? (
                <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
              ) : (
                <Select
                  id="managerUserId"
                  value={formData.managerUserId}
                  onChange={(e) => handleChange('managerUserId', e.target.value)}
                  disabled={loading}
                >
                  <option value="">No manager assigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </Select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Select a user to be the manager of this department
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Department'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

