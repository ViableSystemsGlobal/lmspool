'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Loader2, Upload, Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'

interface CreateCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCourseModal({ open, onOpenChange }: CreateCourseModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    passMark: '70',
    difficulty: 'beginner',
    imageFile: null as File | null,
    imagePreview: null as string | null,
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview)
    }
    setFormData(prev => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // First, upload image if provided
      let imageUrl = undefined
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

      // Prepare course data, only including defined values
      const courseData: any = {
        title: formData.title,
        passMark: parseInt(formData.passMark) || 70,
      }
      
      if (formData.description) courseData.description = formData.description
      if (formData.category) courseData.category = formData.category
      if (formData.difficulty) courseData.difficulty = formData.difficulty
      if (imageUrl) courseData.imageUrl = imageUrl

      // Then create the course
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to create course'
        let errorDetails = ''
        
        if (data.message) {
          errorDetails = ': ' + data.message
        } else if (data.details) {
          if (Array.isArray(data.details)) {
            errorDetails = ': ' + data.details.map((e: any) => {
              const path = e.path && e.path.length > 0 ? e.path.join('.') : 'field'
              return `${path}: ${e.message}`
            }).join(', ')
          } else if (typeof data.details === 'string') {
            errorDetails = ': ' + data.details
          }
        }
        
        console.error('Course creation error:', errorMsg, errorDetails)
        console.error('Full error response:', JSON.stringify(data, null, 2))
        console.error('Request data sent:', JSON.stringify(courseData, null, 2))
        
        // Show detailed error message
        let displayError = errorMsg
        if (data.message) {
          displayError += '\n\n' + data.message
        } else if (data.details) {
          if (typeof data.details === 'string') {
            displayError += '\n\n' + data.details
          } else {
            displayError += '\n\n' + JSON.stringify(data.details, null, 2)
          }
        }
        if (data.code) {
          displayError += '\n\nError code: ' + data.code
        }
        setError(displayError)
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      onOpenChange(false)
      router.refresh()
      router.push(`/admin/courses/${data.course.id}`)
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
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Create a new training course. You can add modules and lessons after creation.
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
              <p className="text-xs text-gray-500 mt-1">
                Minimum score percentage required to pass the course (default: 70%)
              </p>
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
              <p className="text-xs text-gray-500 mt-1">
                Upload an image to represent your course (optional)
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
            <Button type="submit" disabled={loading || !formData.title}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Course'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

