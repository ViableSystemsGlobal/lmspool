'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Plus, Users, FolderOpen, Eye, Edit, Trash2, Archive, Send } from 'lucide-react'
import Link from 'next/link'
import { CreateCourseModal } from '@/components/modals/create-course-modal'
import { EditCourseModal } from '@/components/modals/edit-course-modal'

interface Course {
  id: string
  title: string
  description: string | null
  category: string | null
  status: string
  imageUrl: string | null
  passMark: number
  difficulty: string | null
  _count: {
    enrollments: number
    modules: number
  }
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data.courses || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching courses:', err)
        setLoading(false)
      })
  }, [])

  const handleCourseCreated = () => {
    // Refresh the courses list
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data.courses || [])
      })
      .catch(err => {
        console.error('Error fetching courses:', err)
      })
  }

  const handleCourseUpdated = () => {
    handleCourseCreated()
    setEditModalOpen(false)
    setSelectedCourse(null)
  }

  const handleEdit = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCourse(course)
    setEditModalOpen(true)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(courses.map(c => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectCourse = (courseId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(courseId)
    } else {
      newSelected.delete(courseId)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkAction = async (action: 'delete' | 'publish' | 'archive' | 'draft') => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/courses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseIds: Array.from(selectedIds),
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to ${action} courses: ${data.error || 'Unknown error'}`)
        setBulkActionLoading(false)
        return
      }

      // Refresh courses and clear selection
      handleCourseCreated()
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Bulk action error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const allSelected = courses.length > 0 && selectedIds.size === courses.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < courses.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">Create and manage training courses</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.size} course{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkActionLoading}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('publish')}
                disabled={bulkActionLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('archive')}
                disabled={bulkActionLoading}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('draft')}
                disabled={bulkActionLoading}
              >
                Move to Draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedIds.size} course(s)?`)) {
                    handleBulkAction('delete')
                  }
                }}
                disabled={bulkActionLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
            <p className="text-gray-500 text-sm mb-4">Get started by creating your first course</p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select All Checkbox */}
          {courses.length > 0 && (
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault()
                    handleSelectAll(!allSelected)
                  }
                }}
              />
              <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => handleSelectAll(!allSelected)}>
                Select all ({courses.length})
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
              >
                {/* Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedIds.has(course.id)}
                    onCheckedChange={(checked) => handleSelectCourse(course.id, checked === true)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Clickable area */}
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/courses/${course.id}`)}
                >
                  {course.imageUrl && (
                    <div className="relative w-full h-48 bg-gray-100">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                        {course.title}
                      </CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        course.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : course.status === 'draft' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    {course.description && (
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <FolderOpen className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{course._count.modules} modules</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{course._count.enrollments} enrolled</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 z-10 flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/admin/courses/${course.id}`)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleEdit(course, e)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open)
          if (!open) {
            handleCourseCreated()
          }
        }}
      />

      {/* Edit Course Modal */}
      <EditCourseModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            setSelectedCourse(null)
          }
        }}
        course={selectedCourse}
        onUpdated={handleCourseUpdated}
      />
    </div>
  )
}
