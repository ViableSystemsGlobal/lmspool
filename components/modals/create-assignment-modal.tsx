'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Users, Building, Globe } from 'lucide-react'

interface CreateAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface Course {
  id: string
  title: string
  status: string
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

export function CreateAssignmentModal({ open, onOpenChange, onSuccess }: CreateAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  
  const [formData, setFormData] = useState({
    courseId: '',
    scope: 'department' as 'user' | 'department' | 'all',
    userIds: [] as string[],
    departmentIds: [] as string[],
    dueAt: '',
    graceDays: '0',
    mandatory: true,
  })

  useEffect(() => {
    if (open) {
      // Fetch courses, departments, and users
      Promise.all([
        fetch('/api/courses').then(res => res.json()),
        fetch('/api/departments').then(res => res.json()),
        fetch('/api/users?status=all').then(res => res.json())
      ])
        .then(([courseData, deptData, userData]) => {
          // Show all courses (published, draft, etc.) - admin can assign any course
          const allCourses = courseData.courses || []
          console.log('Fetched courses:', allCourses.length, 'courses')
          console.log('Course statuses:', allCourses.map((c: Course) => ({ id: c.id, title: c.title, status: c.status })))
          setCourses(allCourses)
          setDepartments(deptData.departments || [])
          setUsers(userData.users || [])
          setLoadingData(false)
        })
        .catch(err => {
          console.error('Error fetching data:', err)
          setError('Failed to load courses, departments, or users. Please refresh and try again.')
          setLoadingData(false)
        })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.courseId) {
      setError('Please select a course')
      setLoading(false)
      return
    }

    if (formData.scope === 'user' && formData.userIds.length === 0) {
      setError('Please select at least one user')
      setLoading(false)
      return
    }

    if (formData.scope === 'department' && formData.departmentIds.length === 0) {
      setError('Please select at least one department')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: formData.courseId,
          scope: formData.scope,
          userIds: formData.scope === 'user' ? formData.userIds : undefined,
          departmentIds: formData.scope === 'department' ? formData.departmentIds : undefined,
          dueAt: formData.dueAt || undefined,
          graceDays: parseInt(formData.graceDays) || 0,
          mandatory: formData.mandatory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create assignment')
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      onOpenChange(false)
      setFormData({
        courseId: '',
        scope: 'department',
        userIds: [],
        departmentIds: [],
        dueAt: '',
        graceDays: '0',
        mandatory: true,
      })
      onSuccess?.()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleScopeChange = (scope: 'user' | 'department' | 'all') => {
    setFormData(prev => ({
      ...prev,
      scope,
      userIds: [],
      departmentIds: [],
    }))
  }

  const handleUserToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }))
  }

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }))
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>
            Assign a course to users or departments with a due date
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="courseId">Course *</Label>
              {loadingData ? (
                <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
              ) : (
                <Select
                  id="courseId"
                  value={formData.courseId}
                  onChange={(e) => handleChange('courseId', e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">Select a course</option>
                  {courses.length === 0 ? (
                    <option value="" disabled>No courses available. Create a course first.</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} {course.status !== 'published' ? `(${course.status})` : ''}
                      </option>
                    ))
                  )}
                </Select>
              )}
            </div>

            <div>
              <Label>Assign To *</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scope-department"
                    name="scope"
                    checked={formData.scope === 'department'}
                    onChange={() => handleScopeChange('department')}
                    disabled={loading}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <Label htmlFor="scope-department" className="font-normal cursor-pointer flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    Department(s)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scope-user"
                    name="scope"
                    checked={formData.scope === 'user'}
                    onChange={() => handleScopeChange('user')}
                    disabled={loading}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <Label htmlFor="scope-user" className="font-normal cursor-pointer flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Specific User(s)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scope-all"
                    name="scope"
                    checked={formData.scope === 'all'}
                    onChange={() => handleScopeChange('all')}
                    disabled={loading}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <Label htmlFor="scope-all" className="font-normal cursor-pointer flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    All Users
                  </Label>
                </div>
              </div>
            </div>

            {formData.scope === 'department' && (
              <div>
                <Label>Select Departments</Label>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-3">
                  {loadingData ? (
                    <div className="h-20 bg-gray-100 rounded-md animate-pulse" />
                  ) : departments.length === 0 ? (
                    <p className="text-sm text-gray-500">No departments available</p>
                  ) : (
                    departments.map((dept) => (
                      <div key={dept.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${dept.id}`}
                          checked={formData.departmentIds.includes(dept.id)}
                          onCheckedChange={() => handleDepartmentToggle(dept.id)}
                          disabled={loading}
                        />
                        <Label
                          htmlFor={`dept-${dept.id}`}
                          className="font-normal cursor-pointer"
                        >
                          {dept.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {formData.scope === 'user' && (
              <div>
                <Label>Select Users</Label>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-3">
                  {loadingData ? (
                    <div className="h-20 bg-gray-100 rounded-md animate-pulse" />
                  ) : users.length === 0 ? (
                    <p className="text-sm text-gray-500">No users available</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={formData.userIds.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                          disabled={loading}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="font-normal cursor-pointer"
                        >
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueAt">Due Date</Label>
                <Input
                  id="dueAt"
                  type="datetime-local"
                  value={formData.dueAt}
                  onChange={(e) => handleChange('dueAt', e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional deadline for completion
                </p>
              </div>

              <div>
                <Label htmlFor="graceDays">Grace Period (Days)</Label>
                <Input
                  id="graceDays"
                  type="number"
                  min="0"
                  value={formData.graceDays}
                  onChange={(e) => handleChange('graceDays', e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional days after due date
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mandatory"
                checked={formData.mandatory}
                onCheckedChange={(checked) => handleChange('mandatory', checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="mandatory" className="font-normal cursor-pointer">
                Mandatory (required for completion)
              </Label>
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
            <Button type="submit" disabled={loading || !formData.courseId}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Assignment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

