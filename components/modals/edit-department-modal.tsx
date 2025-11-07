'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

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
}

interface EditDepartmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: Department | null
  onUpdated?: () => void
}

interface DepartmentOption {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

export function EditDepartmentModal({ open, onOpenChange, department, onUpdated }: EditDepartmentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
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
          // Filter out current department from parent options
          const filteredDepartments = (deptData.departments || []).filter(
            (d: Department) => d.id !== department?.id
          )
          setDepartments(filteredDepartments)
          setUsers(userData.users || [])
          setLoadingData(false)
        })
        .catch(err => {
          console.error('Error fetching data:', err)
          setLoadingData(false)
        })
    }
  }, [open, department?.id])

  // Load department data when modal opens
  useEffect(() => {
    if (department && open) {
      setFormData({
        name: department.name || '',
        code: department.code || '',
        parentId: department.parentId || '',
        managerUserId: department.managerUserId || '',
      })
      setError('')
      setLoading(false) // Reset loading state when modal opens with new department
    } else if (!open) {
      // Reset when modal closes
      setLoading(false)
      setError('')
    }
  }, [department, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!department) return
    
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/departments/${department.id}`, {
        method: 'PATCH',
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
        const errorMsg = data.error || 'Failed to update department'
        setError(errorMsg + (data.message ? ': ' + data.message : ''))
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      setLoading(false)
      onOpenChange(false)
      if (onUpdated) {
        onUpdated()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  if (!department) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update department information. Changes will be saved immediately.
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
                  Updating...
                </>
              ) : (
                'Update Department'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

