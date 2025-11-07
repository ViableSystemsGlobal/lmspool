'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Plus, Edit, Trash2, ArrowLeft, GripVertical, FileText, Video, File, HelpCircle, Clock, CheckCircle2 } from 'lucide-react'
import { EditCourseModal } from '@/components/modals/edit-course-modal'
import { CreateModuleModal } from '@/components/modals/create-module-modal'
import { CreateLessonModal } from '@/components/modals/create-lesson-modal'
import { EditModuleModal } from '@/components/modals/edit-module-modal'
import { EditLessonModal } from '@/components/modals/edit-lesson-modal'
import { CreateQuizModal } from '@/components/modals/create-quiz-modal'
import { EditQuizModal } from '@/components/modals/edit-quiz-modal'
import { CreateQuestionModal } from '@/components/modals/create-question-modal'
import { EditQuestionModal } from '@/components/modals/edit-question-modal'

interface Course {
  id: string
  title: string
  description: string | null
  category: string | null
  status: string
  imageUrl: string | null
  passMark: number
  difficulty: string | null
}

interface Module {
  id: string
  title: string
  order: number
  lessons: Lesson[]
  _count: {
    lessons: number
  }
}

interface Lesson {
  id: string
  type: string
  title: string
  contentUrl: string | null
  contentHtml: string | null
  durationMin: number | null
  order: number
}

interface Quiz {
  id: string
  courseId: string
  timeLimitSec: number | null
  attemptsAllowed: number
  randomize: boolean
  passMarkOverride: number | null
  questions: Question[]
  _count: {
    questions: number
    attempts: number
  }
}

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

export default function CourseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false)
  const [createModuleModalOpen, setCreateModuleModalOpen] = useState(false)
  const [createLessonModalOpen, setCreateLessonModalOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [editModuleModalOpen, setEditModuleModalOpen] = useState(false)
  const [editLessonModalOpen, setEditLessonModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<Module | null>(null)
  const [createQuizModalOpen, setCreateQuizModalOpen] = useState(false)
  const [editQuizModalOpen, setEditQuizModalOpen] = useState(false)
  const [createQuestionModalOpen, setCreateQuestionModalOpen] = useState(false)
  const [editQuestionModalOpen, setEditQuestionModalOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  const fetchCourse = () => {
    fetch(`/api/courses/${courseId}`)
      .then(res => res.json())
      .then(data => {
        setCourse(data.course)
      })
      .catch(err => {
        console.error('Error fetching course:', err)
      })
  }

  const fetchModules = () => {
    fetch(`/api/courses/${courseId}/modules`)
      .then(res => res.json())
      .then(data => {
        setModules(data.modules || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching modules:', err)
        setLoading(false)
      })
  }

  const fetchQuiz = () => {
    fetch(`/api/courses/${courseId}/quizzes`)
      .then(res => res.json())
      .then(data => {
        // Course can have one quiz
        setQuiz(data.quizzes && data.quizzes.length > 0 ? data.quizzes[0] : null)
      })
      .catch(err => {
        console.error('Error fetching quiz:', err)
      })
  }

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchModules()
      fetchQuiz()
    }
  }, [courseId])

  const handleModuleCreated = () => {
    fetchModules()
    setCreateModuleModalOpen(false)
  }

  const handleLessonCreated = () => {
    fetchModules()
    setCreateLessonModalOpen(false)
    setSelectedModuleForLesson(null)
  }

  const handleModuleUpdated = () => {
    fetchModules()
    setEditModuleModalOpen(false)
    setSelectedModule(null)
  }

  const handleLessonUpdated = () => {
    fetchModules()
    setEditLessonModalOpen(false)
    setSelectedLesson(null)
  }

  const handleModuleEdit = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedModule(module)
    setEditModuleModalOpen(true)
  }

  const handleModuleDelete = async (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this module? All lessons in this module will also be deleted.')) return

    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to delete module: ${data.error || 'Unknown error'}`)
        return
      }

      fetchModules()
    } catch (err) {
      console.error('Delete module error:', err)
      alert('An error occurred. Please try again.')
    }
  }

  const handleLessonEdit = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedLesson(lesson)
    setEditLessonModalOpen(true)
  }

  const handleLessonDelete = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this lesson?')) return

    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to delete lesson: ${data.error || 'Unknown error'}`)
        return
      }

      fetchModules()
    } catch (err) {
      console.error('Delete lesson error:', err)
      alert('An error occurred. Please try again.')
    }
  }

  const handleAddLesson = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedModuleForLesson(module)
    setCreateLessonModalOpen(true)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/courses')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {course ? course.title : 'Loading...'}
            </h1>
            <p className="text-gray-600 mt-1">
              {course ? (course.description || 'Course details') : 'Loading course details'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setEditCourseModalOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Course
          </Button>
          <Button onClick={() => setCreateModuleModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      </div>

      {/* Course Info */}
      {course && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  course.status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : course.status === 'draft' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {course.status}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Category</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {course.category || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Pass Mark</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {course.passMark}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Difficulty</div>
                <div className="mt-1 text-sm font-medium text-gray-900 capitalize">
                  {course.difficulty || '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modules List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-0 shadow-sm">
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
      ) : modules.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules yet</h3>
            <p className="text-gray-500 text-sm mb-4">Add your first module to organize course content</p>
            <Button onClick={() => setCreateModuleModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => (
            <Card key={module.id} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {module.title}
                      </CardTitle>
                      <span className="text-sm text-gray-500">
                        ({module._count.lessons} {module._count.lessons === 1 ? 'lesson' : 'lessons'})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleAddLesson(module, e)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleModuleEdit(module, e)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleModuleDelete(module.id, e)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {module.lessons.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No lessons in this module</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleAddLesson(module, e)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Lesson
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <div className="flex items-center space-x-2">
                            {getLessonIcon(lesson.type)}
                            <span className="text-sm font-medium text-gray-900">
                              {lesson.title}
                            </span>
                          </div>
                          {lesson.durationMin && (
                            <span className="text-xs text-gray-500">
                              {lesson.durationMin} min
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                            {lesson.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleLessonEdit(lesson, e)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleLessonDelete(lesson.id, e)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quiz Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Quiz</h2>
            <p className="text-gray-600 mt-1">Assessment questions for this course</p>
          </div>
          {!quiz ? (
            <Button onClick={() => setCreateQuizModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditQuizModalOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Quiz
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this quiz? All questions will also be deleted.')) {
                    fetch(`/api/quizzes/${quiz.id}`, {
                      method: 'DELETE',
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.ok) {
                          fetchQuiz()
                        } else {
                          alert(data.error || 'Failed to delete quiz')
                        }
                      })
                      .catch(err => {
                        console.error('Error deleting quiz:', err)
                        alert('Failed to delete quiz')
                      })
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Quiz
              </Button>
            </div>
          )}
        </div>

        {quiz ? (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Course Assessment
                  </CardTitle>
                  <div className="mt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center">
                        <HelpCircle className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{quiz._count.questions} {quiz._count.questions === 1 ? 'question' : 'questions'}</span>
                      </div>
                      {quiz.timeLimitSec && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{Math.floor(quiz.timeLimitSec / 60)} min</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{quiz.attemptsAllowed} {quiz.attemptsAllowed === 1 ? 'attempt' : 'attempts'}</span>
                      </div>
                      {quiz.randomize && (
                        <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          Randomized
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setCreateQuestionModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quiz.questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm mb-4">No questions yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateQuestionModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quiz.questions.map((question, idx) => (
                    <div
                      key={question.id}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">Q{idx + 1}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                            {question.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">{question.points} {question.points === 1 ? 'point' : 'points'}</span>
                        </div>
                        <div 
                          className="text-sm text-gray-900"
                          dangerouslySetInnerHTML={{ __html: question.promptHtml }}
                        />
                        {question.options.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {question.options.map((option, optIdx) => (
                              <div key={option.id} className="flex items-center space-x-2 text-xs">
                                <span className="text-gray-400">{String.fromCharCode(65 + optIdx)}.</span>
                                <span className={option.isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}>
                                  {option.label}
                                  {option.isCorrect && ' ✓'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestion(question)
                            setEditQuestionModalOpen(true)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this question?')) {
                              fetch(`/api/questions/${question.id}`, {
                                method: 'DELETE',
                              })
                                .then(res => res.json())
                                .then(data => {
                                  if (data.ok) {
                                    fetchQuiz()
                                  } else {
                                    alert(data.error || 'Failed to delete question')
                                  }
                                })
                                .catch(err => {
                                  console.error('Error deleting question:', err)
                                  alert('Failed to delete question')
                                })
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz yet</h3>
              <p className="text-gray-500 text-sm mb-4">Create a quiz to assess learners' understanding</p>
              <Button onClick={() => setCreateQuizModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quiz
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Course Modal */}
      {course && (
        <EditCourseModal
          open={editCourseModalOpen}
          onOpenChange={(open) => {
            setEditCourseModalOpen(open)
            if (!open) {
              fetchCourse()
            }
          }}
          course={course}
          onUpdated={() => {
            fetchCourse()
            setEditCourseModalOpen(false)
          }}
        />
      )}

      {/* Create Module Modal */}
      <CreateModuleModal
        open={createModuleModalOpen}
        onOpenChange={(open) => {
          setCreateModuleModalOpen(open)
          if (!open) {
            fetchModules()
          }
        }}
        courseId={courseId}
        onSuccess={handleModuleCreated}
      />

      {/* Edit Module Modal */}
      <EditModuleModal
        open={editModuleModalOpen}
        onOpenChange={(open) => {
          setEditModuleModalOpen(open)
          if (!open) {
            setSelectedModule(null)
          }
        }}
        module={selectedModule}
        onUpdated={handleModuleUpdated}
      />

      {/* Create Lesson Modal */}
      <CreateLessonModal
        open={createLessonModalOpen}
        onOpenChange={(open) => {
          setCreateLessonModalOpen(open)
          if (!open) {
            setSelectedModuleForLesson(null)
          }
        }}
        moduleId={selectedModuleForLesson?.id || ''}
        onSuccess={handleLessonCreated}
      />

      {/* Edit Lesson Modal */}
      <EditLessonModal
        open={editLessonModalOpen}
        onOpenChange={(open) => {
          setEditLessonModalOpen(open)
          if (!open) {
            setSelectedLesson(null)
          }
        }}
        lesson={selectedLesson}
        onUpdated={handleLessonUpdated}
      />

      {/* Create Quiz Modal */}
      <CreateQuizModal
        open={createQuizModalOpen}
        onOpenChange={(open) => {
          setCreateQuizModalOpen(open)
          if (!open) {
            fetchQuiz()
          }
        }}
        courseId={courseId}
        onSuccess={fetchQuiz}
      />

      {/* Edit Quiz Modal */}
      <EditQuizModal
        open={editQuizModalOpen}
        onOpenChange={(open) => {
          setEditQuizModalOpen(open)
          if (!open) {
            fetchQuiz()
          }
        }}
        quiz={quiz}
        onUpdated={fetchQuiz}
      />

      {/* Create Question Modal */}
      {quiz && (
        <CreateQuestionModal
          open={createQuestionModalOpen}
          onOpenChange={(open) => {
            setCreateQuestionModalOpen(open)
            if (!open) {
              fetchQuiz()
            }
          }}
          quizId={quiz.id}
          onSuccess={fetchQuiz}
        />
      )}

      {/* Edit Question Modal */}
      <EditQuestionModal
        open={editQuestionModalOpen}
        onOpenChange={(open) => {
          setEditQuestionModalOpen(open)
          if (!open) {
            setSelectedQuestion(null)
            fetchQuiz()
          }
        }}
        question={selectedQuestion}
        onUpdated={fetchQuiz}
      />
    </div>
  )
}

