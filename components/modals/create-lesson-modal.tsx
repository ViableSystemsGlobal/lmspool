'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface CreateLessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  moduleId: string
  onSuccess?: () => void
}

export function CreateLessonModal({ open, onOpenChange, moduleId, onSuccess }: CreateLessonModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoSource, setVideoSource] = useState<'url' | 'upload'>('url')
  
  const [formData, setFormData] = useState({
    type: 'text' as 'text' | 'video' | 'pdf',
    title: '',
    contentUrl: '',
    contentHtml: '',
    durationMin: '',
  })

  useEffect(() => {
    if (open) {
      setFormData({
        type: 'text',
        title: '',
        contentUrl: '',
        contentHtml: '',
        durationMin: '',
      })
      setVideoFile(null)
      setVideoPreview(null)
      setVideoSource('url')
      setError('')
      setLoading(false)
    }
  }, [open])

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file')
        return
      }
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setVideoFile(null)
    setVideoPreview(null)
  }

  const isYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const lessonData: any = {
        type: formData.type,
        title: formData.title,
        durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
      }

      // Set content based on type
      if (formData.type === 'text') {
        lessonData.contentHtml = formData.contentHtml || undefined
      } else if (formData.type === 'video') {
        // Handle video: YouTube URL or file upload
        if (videoSource === 'upload' && videoFile) {
          // Upload video file
          const formDataToUpload = new FormData()
          formDataToUpload.append('file', videoFile)
          formDataToUpload.append('description', `Video lesson: ${formData.title}`)

          const uploadResponse = await fetch('/api/files', {
            method: 'POST',
            body: formDataToUpload,
          })

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            lessonData.contentUrl = uploadData.file.url
          } else {
            setError('Failed to upload video file. Please try again.')
            setLoading(false)
            return
          }
        } else if (videoSource === 'url' && formData.contentUrl) {
          // Validate YouTube URL if provided
          if (isYouTubeUrl(formData.contentUrl)) {
            lessonData.contentUrl = formData.contentUrl
          } else {
            setError('Please enter a valid YouTube URL or upload a video file')
            setLoading(false)
            return
          }
        } else {
          setError('Please provide a YouTube URL or upload a video file')
          setLoading(false)
          return
        }
      } else if (formData.type === 'pdf') {
        lessonData.contentUrl = formData.contentUrl || undefined
      }

      const response = await fetch(`/api/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create lesson')
        setLoading(false)
        return
      }

      // Success - close modal and refresh
      onOpenChange(false)
      setFormData({
        type: 'text',
        title: '',
        contentUrl: '',
        contentHtml: '',
        durationMin: '',
      })
      setVideoFile(null)
      setVideoPreview(null)
      setVideoSource('url')
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
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson to this module
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Lesson Type *</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="text">Text</option>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="durationMin">Duration (minutes)</Label>
                <Input
                  id="durationMin"
                  type="number"
                  min="0"
                  value={formData.durationMin}
                  onChange={(e) => handleChange('durationMin', e.target.value)}
                  placeholder="e.g., 15"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Lesson Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Welcome to the Course"
                required
                disabled={loading}
              />
            </div>

            {formData.type === 'text' && (
              <div>
                <Label htmlFor="contentHtml">Content (HTML)</Label>
                <Textarea
                  id="contentHtml"
                  value={formData.contentHtml}
                  onChange={(e) => handleChange('contentHtml', e.target.value)}
                  placeholder="Enter lesson content in HTML format..."
                  rows={8}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use HTML tags for formatting
                </p>
              </div>
            )}

            {formData.type === 'video' && (
              <div className="space-y-4">
                <div>
                  <Label>Video Source</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="videoSource"
                        value="url"
                        checked={videoSource === 'url'}
                        onChange={(e) => setVideoSource(e.target.value as 'url' | 'upload')}
                        disabled={loading}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">YouTube URL</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="videoSource"
                        value="upload"
                        checked={videoSource === 'upload'}
                        onChange={(e) => setVideoSource(e.target.value as 'url' | 'upload')}
                        disabled={loading}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Upload Video</span>
                    </label>
                  </div>
                </div>

                {videoSource === 'url' ? (
                  <div>
                    <Label htmlFor="contentUrl">YouTube URL *</Label>
                    <Input
                      id="contentUrl"
                      value={formData.contentUrl}
                      onChange={(e) => handleChange('contentUrl', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a YouTube video URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="videoFile">Video File *</Label>
                    <Input
                      id="videoFile"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      disabled={loading}
                      className="cursor-pointer"
                    />
                    {videoPreview && (
                      <div className="mt-3 relative">
                        <video
                          src={videoPreview}
                          controls
                          className="w-full h-auto rounded-lg border border-gray-200"
                          style={{ maxHeight: '300px' }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeVideo}
                          className="absolute top-2 right-2 bg-white hover:bg-gray-50"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a video file (MP4, MOV, etc.). Maximum size: 100MB
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.type === 'pdf' && (
              <div>
                <Label htmlFor="contentUrl">PDF File Path *</Label>
                <Input
                  id="contentUrl"
                  value={formData.contentUrl}
                  onChange={(e) => handleChange('contentUrl', e.target.value)}
                  placeholder="/api/uploads/document.pdf"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter path to uploaded PDF file
                </p>
              </div>
            )}

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
                'Create Lesson'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

