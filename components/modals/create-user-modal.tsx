'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface Department {
  id: string
  name: string
}

interface Role {
  id: number
  name: string
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    jobTitle: '',
    employeeCode: '',
    roleIds: [] as number[],
  })

  useEffect(() => {
    if (open) {
      // Fetch departments and roles
      Promise.all([
        fetch('/api/departments').then(res => res.json()),
        fetch('/api/roles').then(res => res.json()).catch(() => ({ roles: [] }))
      ])
        .then(([deptData, rolesData]) => {
          setDepartments(deptData.departments || [])
          setRoles(rolesData.roles || [])
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
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          departmentId: formData.departmentId || undefined,
          jobTitle: formData.jobTitle || undefined,
          employeeCode: formData.employeeCode || undefined,
          roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined, // Will default to LEARNER on server
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create user')
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      onOpenChange(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        departmentId: '',
        jobTitle: '',
        employeeCode: '',
        roleIds: [],
      })
      onSuccess?.()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]
    }))
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. You can assign roles and departments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1234567890"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="employeeCode">Employee Code</Label>
                <Input
                  id="employeeCode"
                  value={formData.employeeCode}
                  onChange={(e) => handleChange('employeeCode', e.target.value)}
                  placeholder="EMP001"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                placeholder="Software Engineer"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="departmentId">Department</Label>
              {loadingData ? (
                <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
              ) : (
                <Select
                  id="departmentId"
                  value={formData.departmentId}
                  onChange={(e) => handleChange('departmentId', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div>
              <Label>Roles *</Label>
              <div className="mt-2 space-y-2">
                {loadingData ? (
                  <div className="h-20 bg-gray-100 rounded-md animate-pulse" />
                ) : (
                  roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.roleIds.includes(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                        disabled={loading}
                      />
                      <Label
                        htmlFor={`role-${role.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {role.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select one or more roles for this user (default: LEARNER)
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
            <Button type="submit" disabled={loading || !formData.name || !formData.email}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

