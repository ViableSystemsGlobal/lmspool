'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface CreateQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onSuccess?: () => void
}

export function CreateQuizModal({ open, onOpenChange, courseId, onSuccess }: CreateQuizModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    timeLimitSec: '',
    attemptsAllowed: '3',
    randomize: false,
    passMarkOverride: '',
  })

  useEffect(() => {
    if (open) {
      setFormData({
        timeLimitSec: '',
        attemptsAllowed: '3',
        randomize: false,
        passMarkOverride: '',
      })
      setError('')
      setLoading(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const quizData: any = {
        attemptsAllowed: parseInt(formData.attemptsAllowed) || 3,
        randomize: formData.randomize,
      }

      if (formData.timeLimitSec) {
        quizData.timeLimitSec = parseInt(formData.timeLimitSec)
      }

      if (formData.passMarkOverride) {
        quizData.passMarkOverride = parseInt(formData.passMarkOverride)
      }

      const response = await fetch(`/api/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create quiz')
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      onOpenChange(false)
      setFormData({
        timeLimitSec: '',
        attemptsAllowed: '3',
        randomize: false,
        passMarkOverride: '',
      })
      onSuccess?.()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Quiz</DialogTitle>
          <DialogDescription>
            Configure quiz settings for this course
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeLimitSec">Time Limit (seconds)</Label>
                <Input
                  id="timeLimitSec"
                  type="number"
                  min="0"
                  value={formData.timeLimitSec}
                  onChange={(e) => handleChange('timeLimitSec', e.target.value)}
                  placeholder="e.g., 1800 (30 min)"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no time limit
                </p>
              </div>

              <div>
                <Label htmlFor="attemptsAllowed">Attempts Allowed *</Label>
                <Input
                  id="attemptsAllowed"
                  type="number"
                  min="1"
                  value={formData.attemptsAllowed}
                  onChange={(e) => handleChange('attemptsAllowed', e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of times learners can take the quiz
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="passMarkOverride">Pass Mark Override (%)</Label>
              <Input
                id="passMarkOverride"
                type="number"
                min="0"
                max="100"
                value={formData.passMarkOverride}
                onChange={(e) => handleChange('passMarkOverride', e.target.value)}
                placeholder="e.g., 70"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Override course pass mark for this quiz (optional)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="randomize"
                checked={formData.randomize}
                onCheckedChange={(checked) => handleChange('randomize', checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="randomize" className="font-normal cursor-pointer">
                Randomize question order
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
            <Button type="submit" disabled={loading || !formData.attemptsAllowed}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Quiz'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

