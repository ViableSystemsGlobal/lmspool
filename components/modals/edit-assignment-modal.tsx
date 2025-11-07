'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface Assignment {
  id: string
  courseId: string
  scope: string
  dueAt: string | null
  graceDays: number
  mandatory: boolean
  course: {
    id: string
    title: string
    status: string
  } | null
}

interface EditAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Assignment | null
  onUpdated?: () => void
}

export function EditAssignmentModal({ open, onOpenChange, assignment, onUpdated }: EditAssignmentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    dueAt: '',
    graceDays: '0',
    mandatory: true,
  })

  // Load assignment data when modal opens
  useEffect(() => {
    if (assignment && open) {
      // Format due date for datetime-local input
      const dueDate = assignment.dueAt 
        ? new Date(assignment.dueAt).toISOString().slice(0, 16)
        : ''
      
      setFormData({
        dueAt: dueDate,
        graceDays: assignment.graceDays?.toString() || '0',
        mandatory: assignment.mandatory || false,
      })
      setError('')
      setLoading(false) // Reset loading state when modal opens
    } else if (!open) {
      // Reset when modal closes
      setLoading(false)
      setError('')
    }
  }, [assignment, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignment) return
    
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueAt: formData.dueAt || undefined,
          graceDays: parseInt(formData.graceDays) || 0,
          mandatory: formData.mandatory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to update assignment'
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

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  if (!assignment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update assignment details. Course and scope cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Course</Label>
              <Input
                value={assignment.course?.title || 'Unknown Course'}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Course cannot be changed</p>
            </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Assignment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

