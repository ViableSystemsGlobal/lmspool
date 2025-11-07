'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, X } from 'lucide-react'

interface Question {
  id: string
  type: string
  promptHtml: string
  points: number
  order: number
  explanationHtml: string | null
  options: QuestionOption[]
}

interface QuestionOption {
  id: string
  label: string
  isCorrect: boolean
  order: number
}

interface EditQuestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: Question | null
  onUpdated?: () => void
}

interface LocalOption {
  label: string
  isCorrect: boolean
  order: number
}

export function EditQuestionModal({ open, onOpenChange, question, onUpdated }: EditQuestionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    type: 'single_choice' as 'single_choice' | 'multi_choice' | 'true_false' | 'short_answer',
    promptHtml: '',
    points: '1',
    explanationHtml: '',
  })

  const [options, setOptions] = useState<LocalOption[]>([])

  useEffect(() => {
    if (question && open) {
      setFormData({
        type: (question.type as 'single_choice' | 'multi_choice' | 'true_false' | 'short_answer') || 'single_choice',
        promptHtml: question.promptHtml || '',
        points: question.points.toString(),
        explanationHtml: question.explanationHtml || '',
      })
      setOptions(question.options.map(opt => ({
        label: opt.label,
        isCorrect: opt.isCorrect,
        order: opt.order,
      })))
      setError('')
      setLoading(false)
    } else if (!open) {
      setLoading(false)
      setError('')
    }
  }, [question, open])

  useEffect(() => {
    // Auto-setup options when type changes
    if (formData.type === 'true_false' && options.length === 0) {
      setOptions([
        { label: 'True', isCorrect: true, order: 0 },
        { label: 'False', isCorrect: false, order: 1 },
      ])
    } else if (formData.type === 'short_answer' && options.length > 0) {
      setOptions([])
    } else if ((formData.type === 'single_choice' || formData.type === 'multi_choice') && options.length === 0) {
      setOptions([
        { label: '', isCorrect: false, order: 0 },
        { label: '', isCorrect: false, order: 1 },
      ])
    }
  }, [formData.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question) return
    
    setLoading(true)
    setError('')

    // Validate based on question type
    if (formData.type !== 'short_answer') {
      if (options.length < 2) {
        setError('Please add at least 2 options')
        setLoading(false)
        return
      }

      const validOptions = options.filter(opt => opt.label.trim() !== '')
      if (validOptions.length < 2) {
        setError('All options must have labels')
        setLoading(false)
        return
      }

      const hasCorrect = validOptions.some(opt => opt.isCorrect)
      if (!hasCorrect) {
        setError('Please mark at least one option as correct')
        setLoading(false)
        return
      }

      if (formData.type === 'single_choice' && validOptions.filter(opt => opt.isCorrect).length > 1) {
        setError('Single choice questions can only have one correct answer')
        setLoading(false)
        return
      }
    }

    try {
      const questionData: any = {
        type: formData.type,
        promptHtml: formData.promptHtml,
        points: parseInt(formData.points) || 1,
        explanationHtml: formData.explanationHtml || undefined,
      }

      if (formData.type !== 'short_answer') {
        questionData.options = options
          .filter(opt => opt.label.trim() !== '')
          .map((opt, idx) => ({
            label: opt.label.trim(),
            isCorrect: opt.isCorrect,
            order: idx,
          }))
      } else {
        questionData.options = []
      }

      const response = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to update question'
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

  const handleAddOption = () => {
    setOptions([...options, { label: '', isCorrect: false, order: options.length }])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index).map((opt, idx) => ({ ...opt, order: idx })))
  }

  const handleOptionChange = (index: number, field: 'label' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    
    // For single choice, ensure only one is correct
    if (field === 'isCorrect' && formData.type === 'single_choice' && value === true) {
      newOptions.forEach((opt, idx) => {
        if (idx !== index) opt.isCorrect = false
      })
    }
    
    setOptions(newOptions)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  if (!question) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>
            Update question and answer options
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Question Type *</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => {
                    handleChange('type', e.target.value)
                    setError('')
                  }}
                  required
                  disabled={loading}
                >
                  <option value="single_choice">Single Choice</option>
                  <option value="multi_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="points">Points *</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={(e) => handleChange('points', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="promptHtml">Question Text *</Label>
              <Textarea
                id="promptHtml"
                value={formData.promptHtml}
                onChange={(e) => handleChange('promptHtml', e.target.value)}
                placeholder="Enter your question here..."
                rows={4}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                You can use HTML tags for formatting
              </p>
            </div>

            {formData.type !== 'short_answer' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Answer Options *</Label>
                  {formData.type !== 'true_false' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <Input
                          value={option.label}
                          onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          disabled={loading || formData.type === 'true_false'}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => handleOptionChange(index, 'isCorrect', checked as boolean)}
                          disabled={loading || option.label.trim() === ''}
                        />
                        <Label className="text-xs text-gray-600">Correct</Label>
                        {formData.type !== 'true_false' && options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                            disabled={loading}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === 'single_choice' && 'Select exactly one correct answer'}
                  {formData.type === 'multi_choice' && 'Select one or more correct answers'}
                  {formData.type === 'true_false' && 'Mark which option is correct'}
                </p>
              </div>
            )}

            {formData.type === 'short_answer' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Short answer questions don't require predefined options. Learners will type their answer, which can be reviewed manually or matched against expected answers if you add them later.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="explanationHtml">Explanation (Optional)</Label>
              <Textarea
                id="explanationHtml"
                value={formData.explanationHtml}
                onChange={(e) => handleChange('explanationHtml', e.target.value)}
                placeholder="Explain the correct answer..."
                rows={3}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be shown to learners after they submit their answer
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
            <Button type="submit" disabled={loading || !formData.promptHtml}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Question'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

