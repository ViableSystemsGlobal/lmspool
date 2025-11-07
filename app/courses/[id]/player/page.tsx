'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle, ChevronRight, FileText, Video, File, Clock, HelpCircle, Menu, X } from 'lucide-react'

interface Lesson {
  id: string
  type: string
  title: string
  contentUrl: string | null
  contentHtml: string | null
  durationMin: number | null
  order: number
  completed: boolean
}

interface Module {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string | null
  progress: {
    total: number
    completed: number
    percentage: number
  }
  enrollment: {
    id: string
    status: string
    startedAt: string | null
    completedAt: string | null
    dueAt: string | null
  }
}

interface Quiz {
  id: string
  timeLimitSec: number | null
  attemptsAllowed: number
}

export default function CoursePlayerPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [completing, setCompleting] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchCourseData = useCallback(async () => {
    if (!courseId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/player`)
      const data = await res.json()
      
      if (data.error) {
        alert(data.error)
        router.push('/learn/dashboard')
        return
      }
      
      setCourse(data.course)
      setModules(data.modules || [])
      setQuizzes(data.quizzes || [])
      
      // Auto-select first incomplete lesson or first lesson
      const allLessons = (data.modules || []).flatMap((m: Module) => m.lessons)
      const firstIncomplete = allLessons.find((l: Lesson) => !l.completed)
      const firstLesson = allLessons[0]
      setSelectedLesson(firstIncomplete || firstLesson || null)
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching course:', err)
      setLoading(false)
    }
  }, [courseId, router])

  useEffect(() => {
    fetchCourseData()
  }, [fetchCourseData])

  // Track lesson viewing time
  useEffect(() => {
    if (!selectedLesson) return

    // Track initial view
    const trackView = async () => {
      try {
        await fetch(`/api/lessons/${selectedLesson.id}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incrementView: true }),
        })
      } catch (err) {
        console.error('Error tracking lesson view:', err)
      }
    }

    trackView()
    const lessonStartTime = new Date()
    setStartTime(lessonStartTime)

    // Track time spent every 30 seconds
    const interval = setInterval(async () => {
      try {
        await fetch(`/api/lessons/${selectedLesson.id}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSpentSec: 30 }), // Track 30 seconds
        })
      } catch (err) {
        console.error('Error tracking lesson time:', err)
      }
    }, 30000) // Every 30 seconds

    // Cleanup on unmount or lesson change
    return () => {
      clearInterval(interval)
      // Track final time spent when leaving lesson
      const finalTimeSpent = Math.floor((new Date().getTime() - lessonStartTime.getTime()) / 1000)
      if (finalTimeSpent > 0) {
        fetch(`/api/lessons/${selectedLesson.id}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSpentSec: finalTimeSpent }),
        }).catch(err => console.error('Error tracking final time:', err))
      }
    }
  }, [selectedLesson?.id]) // Re-run when lesson changes

  const handleMarkComplete = async () => {
    if (!selectedLesson || completing) return
    
    setCompleting(true)
    try {
      const response = await fetch(`/api/lessons/${selectedLesson.id}/complete`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to mark lesson as complete')
        setCompleting(false)
        return
      }

      // Refresh course data
      fetchCourseData()
    } catch (err) {
      console.error('Error completing lesson:', err)
      alert('An error occurred')
    } finally {
      setCompleting(false)
    }
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'pdf':
        return <File className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getNextLesson = (): Lesson | null => {
    if (!selectedLesson) return null
    const allLessons = modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id)
    return currentIndex >= 0 && currentIndex < allLessons.length - 1 
      ? allLessons[currentIndex + 1] 
      : null
  }

  const getPrevLesson = (): Lesson | null => {
    if (!selectedLesson) return null
    const allLessons = modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id)
    return currentIndex > 0 ? allLessons[currentIndex - 1] : null
  }

  const nextLesson = getNextLesson()
  const prevLesson = getPrevLesson()

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Course not found or you're not enrolled</p>
            <Button onClick={() => router.push('/learn/dashboard')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <h2 className="text-sm font-semibold text-gray-900 truncate flex-1 mx-2">
          {course.title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/learn/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-80 border-r border-gray-200 bg-white overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        pt-16 lg:pt-0
      `}>
        <div className="p-4 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/learn/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
          {course.description && (
            <p className="text-sm text-gray-600 mt-2">{course.description}</p>
          )}
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{course.progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${course.progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {course.progress.completed} of {course.progress.total} lessons completed
            </p>
          </div>
        </div>

        {/* Modules & Lessons */}
        <div className="p-4 space-y-4">
          {modules.map((module) => (
            <div key={module.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">{module.title}</h3>
              <div className="space-y-1">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setSelectedLesson(lesson)
                      // Close sidebar on mobile after selecting lesson
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setSidebarOpen(false)
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                      selectedLesson?.id === lesson.id
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : lesson.completed
                        ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getLessonIcon(lesson.type)}
                      <span className="truncate">{lesson.title}</span>
                    </div>
                    {lesson.completed && (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quiz Section */}
          {quizzes.length > 0 && (
            <div className="space-y-2 mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Quiz</h3>
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => {
                    // Navigate to quiz page
                    router.push(`/courses/${courseId}/quiz/${quiz.id}`)
                    // Close sidebar on mobile
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Course Quiz</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selectedLesson ? (
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Lesson Header */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                {getLessonIcon(selectedLesson.type)}
                <span className="capitalize">{selectedLesson.type.replace('_', ' ')}</span>
                {selectedLesson.durationMin && (
                  <>
                    <span>•</span>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{selectedLesson.durationMin} min</span>
                    </div>
                  </>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">{selectedLesson.title}</h1>
              
              {selectedLesson.completed && (
                <div className="flex items-center space-x-2 text-sm text-green-600 mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed</span>
                </div>
              )}
            </div>

            {/* Lesson Content */}
            <Card className="border-0 shadow-sm mb-6">
              <CardContent className="p-4 sm:p-6">
                {selectedLesson.type === 'text' && selectedLesson.contentHtml && (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedLesson.contentHtml }}
                  />
                )}

                {selectedLesson.type === 'video' && selectedLesson.contentUrl && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden w-full">
                    {selectedLesson.contentUrl.includes('youtube.com') || selectedLesson.contentUrl.includes('youtu.be') ? (
                      <iframe
                        src={selectedLesson.contentUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ minHeight: '200px' }}
                      />
                    ) : (
                      <video
                        src={selectedLesson.contentUrl}
                        controls
                        className="w-full h-full"
                        style={{ minHeight: '200px' }}
                      />
                    )}
                  </div>
                )}

                {selectedLesson.type === 'pdf' && selectedLesson.contentUrl && (
                  <div className="w-full h-[400px] sm:h-[600px]">
                    <iframe
                      src={selectedLesson.contentUrl}
                      className="w-full h-full border border-gray-200 rounded-lg"
                    />
                  </div>
                )}

                {!selectedLesson.contentHtml && !selectedLesson.contentUrl && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No content available for this lesson</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                {prevLesson ? (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLesson(prevLesson)}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                {!selectedLesson.completed && (
                  <Button
                    onClick={handleMarkComplete}
                    disabled={completing}
                    className="w-full sm:w-auto"
                  >
                    {completing ? (
                      'Marking...'
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                )}
                {nextLesson ? (
                  <Button
                    onClick={() => setSelectedLesson(nextLesson)}
                    className="w-full sm:w-auto"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : quizzes.length > 0 && (
                  <Button
                    onClick={() => router.push(`/courses/${courseId}/quiz/${quizzes[0].id}`)}
                    className="w-full sm:w-auto"
                  >
                    Take Quiz
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Select a lesson to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

