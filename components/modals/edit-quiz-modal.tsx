'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface Quiz {
  id: string
  courseId: string
  timeLimitSec: number | null
  attemptsAllowed: number
  randomize: boolean
  passMarkOverride: number | null
}

interface EditQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  onUpdated?: () => void
}

export function EditQuizModal({ open, onOpenChange, quiz, onUpdated }: EditQuizModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    timeLimitSec: '',
    attemptsAllowed: '3',
    randomize: false,
    passMarkOverride: '',
  })

  useEffect(() => {
    if (quiz && open) {
      setFormData({
        timeLimitSec: quiz.timeLimitSec?.toString() || '',
        attemptsAllowed: quiz.attemptsAllowed.toString(),
        randomize: quiz.randomize || false,
        passMarkOverride: quiz.passMarkOverride?.toString() || '',
      })
      setError('')
      setLoading(false)
    } else if (!open) {
      setLoading(false)
      setError('')
    }
  }, [quiz, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quiz) return
    
    setLoading(true)
    setError('')

    try {
      const quizData: any = {
        attemptsAllowed: parseInt(formData.attemptsAllowed) || 3,
        randomize: formData.randomize,
      }

      if (formData.timeLimitSec) {
        quizData.timeLimitSec = parseInt(formData.timeLimitSec)
      } else {
        quizData.timeLimitSec = null
      }

      if (formData.passMarkOverride) {
        quizData.passMarkOverride = parseInt(formData.passMarkOverride)
      } else {
        quizData.passMarkOverride = null
      }

      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to update quiz'
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

  if (!quiz) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Quiz Settings</DialogTitle>
          <DialogDescription>
            Update quiz configuration
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
                  Updating...
                </>
              ) : (
                'Update Quiz'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

