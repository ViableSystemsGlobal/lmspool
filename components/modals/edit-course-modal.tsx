'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Loader2, Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'

interface Course {
  id: string
  title: string
  description: string | null
  category: string | null
  passMark: number
  status: string
  difficulty: string | null
  imageUrl: string | null
}

interface EditCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | null
  onUpdated?: () => void
}

export function EditCourseModal({ open, onOpenChange, course, onUpdated }: EditCourseModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    passMark: '70',
    difficulty: 'beginner',
    status: 'draft',
    imageFile: null as File | null,
    imagePreview: null as string | null,
    existingImageUrl: null as string | null,
  })

  // Load course data when modal opens
  useEffect(() => {
    if (course && open) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        passMark: course.passMark?.toString() || '70',
        difficulty: course.difficulty || 'beginner',
        status: course.status || 'draft',
        imageFile: null,
        imagePreview: course.imageUrl || null,
        existingImageUrl: course.imageUrl,
      })
      setError('')
      setLoading(false) // Reset loading state when modal opens with new course
    } else if (!open) {
      // Reset when modal closes
      setLoading(false)
      setError('')
    }
  }, [course, open])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      }))
      setError('')
    }
  }

  const removeImage = () => {
    if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imagePreview)
    }
    setFormData(prev => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      existingImageUrl: null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!course) return
    
    setLoading(true)
    setError('')

    try {
      // First, upload new image if provided
      let imageUrl = formData.existingImageUrl || undefined
      if (formData.imageFile) {
        const formDataToUpload = new FormData()
        formDataToUpload.append('file', formData.imageFile)
        formDataToUpload.append('description', `Course image for ${formData.title}`)

        const uploadResponse = await fetch('/api/files', {
          method: 'POST',
          body: formDataToUpload,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          imageUrl = uploadData.file.url
        } else {
          setError('Failed to upload image. Please try again.')
          setLoading(false)
          return
        }
      }

      // Prepare course data
      const courseData: any = {
        title: formData.title,
        passMark: parseInt(formData.passMark) || 70,
        status: formData.status,
      }
      
      if (formData.description) courseData.description = formData.description
      else courseData.description = null
      
      if (formData.category) courseData.category = formData.category
      else courseData.category = null
      
      if (formData.difficulty) courseData.difficulty = formData.difficulty
      else courseData.difficulty = null
      
      if (imageUrl !== undefined) courseData.imageUrl = imageUrl
      else if (!formData.existingImageUrl) courseData.imageUrl = null

      // Update the course
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to update course'
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

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Workplace Safety Training"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of the course..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select category</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="compliance">Compliance</option>
                  <option value="safety">Safety</option>
                  <option value="product-knowledge">Product Knowledge</option>
                  <option value="soft-skills">Soft Skills</option>
                  <option value="technical">Technical</option>
                  <option value="leadership">Leadership</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                  disabled={loading}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="passMark">Pass Mark (%)</Label>
                <Input
                  id="passMark"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passMark}
                  onChange={(e) => handleChange('passMark', e.target.value)}
                  placeholder="70"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={loading}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="image">Course Image</Label>
              <div className="mt-2 space-y-2">
                {formData.imagePreview ? (
                  <div className="relative">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={formData.imagePreview}
                        alt="Course preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                      className="mt-2"
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <Label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <Input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={loading}
                      />
                    </Label>
                  </div>
                )}
              </div>
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
            <Button type="submit" disabled={loading || !formData.title}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Course'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
