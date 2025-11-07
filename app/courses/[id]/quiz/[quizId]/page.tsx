'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface Question {
  id: string
  type: string
  promptHtml: string
  points: number
  order: number
  options: QuestionOption[]
}

interface QuestionOption {
  id: string
  label: string
  order: number
}

interface Attempt {
  id: string
  quizId: string
  attemptNo: number
  startedAt: string
  timeLimitSec: number | null
}

interface QuizResult {
  attempt: {
    id: string
    score: number
    maxScore: number
    percentage: number
    passed: boolean
    submittedAt: string
  }
  results: Array<{
    questionId: string
    isCorrect: boolean
    explanationHtml: string | null
  }>
}

export default function QuizTakingPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const quizId = params.quizId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<{ [questionId: string]: string[] | string }>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [result, setResult] = useState<QuizResult | null>(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (quizId) {
      startQuiz()
    }
  }, [quizId])

  useEffect(() => {
    if (attempt?.timeLimitSec && !result) {
      const endTime = new Date(attempt.startedAt).getTime() + (attempt.timeLimitSec * 1000)
      
      const timer = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
        setTimeRemaining(remaining)

        if (remaining === 0) {
          handleAutoSubmit()
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [attempt, result])

  const startQuiz = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/quizzes/${quizId}/start`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to start quiz')
        setLoading(false)
        return
      }

      setAttempt(data.attempt)
      setQuestions(data.questions || [])
      setTimeRemaining(data.attempt.timeLimitSec || null)
      setLoading(false)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, questionType: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleAutoSubmit = async () => {
    if (submitting || result) return
    await handleSubmit(true)
  }

  const handleSubmit = async (autoSubmit = false) => {
    // Prevent multiple simultaneous submissions
    if (!attempt || submitting || result || isSubmittingRef.current) {
      console.log('Submit blocked:', { attempt: !!attempt, submitting, result: !!result, isSubmitting: isSubmittingRef.current })
      return
    }

    isSubmittingRef.current = true
    setSubmitting(true)
    setError('')

    try {
      // Build answer array from answers state
      const answerArray = Object.entries(answers).map(([questionId, value]) => {
        if (Array.isArray(value)) {
          return {
            questionId,
            optionIds: value,
          }
        } else if (typeof value === 'string') {
          return {
            questionId,
            responseText: value,
          }
        } else {
          // Fallback: ensure we always send something
          return {
            questionId,
            optionIds: [],
          }
        }
      })

      // Build answers array - include all questions, even unanswered ones
      const submittedAnswers = questions.map(q => {
        const existingAnswer = answerArray.find(a => a.questionId === q.id)
        if (existingAnswer) {
          return existingAnswer
        }
        // Return empty answer structure for unanswered questions
        if (q.type === 'short_answer') {
          return {
            questionId: q.id,
            responseText: '',
          }
        } else {
          // Single choice, multi choice, or true/false
          return {
            questionId: q.id,
            optionIds: [],
          }
        }
      })

      const requestBody = {
        attemptId: attempt.id.toString(), // Ensure it's a string
        answers: submittedAnswers,
      }

      console.log('Submitting quiz:', requestBody)

      const response = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        data = { error: 'Failed to parse server response' }
      }

      if (!response.ok) {
        console.error('Quiz submit error:', {
          status: response.status,
          statusText: response.statusText,
          data,
        })
        setError(data.error || data.details?.join(', ') || `Failed to submit quiz (${response.status})`)
        setSubmitting(false)
        isSubmittingRef.current = false
        return
      }

      setResult(data)
      setSubmitting(false)
      isSubmittingRef.current = false
    } catch (err) {
      console.error('Quiz submit exception:', err)
      setError('An error occurred. Please try again.')
      setSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error && !attempt) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push(`/courses/${courseId}/player`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result) {
    const percentage = result.attempt.percentage
    const passed = result.attempt.passed

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/courses/${courseId}/player`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-900">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Summary */}
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className={`text-5xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {percentage}%
              </div>
              <p className="text-lg text-gray-700 mb-1">
                Score: {result.attempt.score} / {result.attempt.maxScore} points
              </p>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {passed ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Passed
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Not Passed
                  </>
                )}
              </div>
            </div>

            {/* Question Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Review Your Answers</h3>
              {questions.map((question, idx) => {
                const questionResult = result.results.find(r => r.questionId === question.id)
                const isCorrect = questionResult?.isCorrect || false
                const userAnswer = answers[question.id]

                return (
                  <Card key={question.id} className={`border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">Question {idx + 1}</span>
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <span className="text-xs text-gray-500">{question.points} points</span>
                          </div>
                          <div 
                            className="text-sm text-gray-900"
                            dangerouslySetInnerHTML={{ __html: question.promptHtml }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {question.type !== 'short_answer' && question.options.length > 0 && (
                        <div className="space-y-2">
                          {question.options.map((option) => {
                            const isSelected = Array.isArray(userAnswer) 
                              ? userAnswer.includes(option.id)
                              : userAnswer === option.id
                            return (
                              <div
                                key={option.id}
                                className={`p-2 rounded border ${
                                  isSelected
                                    ? isCorrect
                                      ? 'bg-green-100 border-green-300'
                                      : 'bg-red-100 border-red-300'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{option.label}</span>
                                  {isSelected && (
                                    <span className="text-xs font-medium">Your answer</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {question.type === 'short_answer' && (
                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Your answer:</p>
                          <p className="text-sm text-gray-900">{userAnswer || '(No answer provided)'}</p>
                        </div>
                      )}

                      {questionResult?.explanationHtml && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs font-semibold text-blue-800 mb-1">Explanation:</p>
                          <div 
                            className="text-sm text-blue-900"
                            dangerouslySetInnerHTML={{ __html: questionResult.explanationHtml }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex justify-center space-x-4 pt-4">
              <Button
                onClick={() => router.push(`/courses/${courseId}/player`)}
              >
                Back to Course
              </Button>
              {!passed && attempt && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Retry quiz
                    setResult(null)
                    setAnswers({})
                    startQuiz()
                  }}
                >
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/courses/${courseId}/player`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
      </div>

      {/* Timer */}
      {timeRemaining !== null && (
        <Card className="border-0 shadow-sm bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Time Remaining:</span>
                <span className={`text-lg font-bold ${timeRemaining < 60 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              {timeRemaining < 60 && (
                <span className="text-xs text-red-600 font-medium">Time is running out!</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Questions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-900">Quiz</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Answer all questions. You can review your answers before submitting.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {questions.map((question, idx) => (
            <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">Question {idx + 1}</span>
                    <span className="text-xs text-gray-500">{question.points} {question.points === 1 ? 'point' : 'points'}</span>
                  </div>
                  <div 
                    className="text-sm text-gray-900 mb-4"
                    dangerouslySetInnerHTML={{ __html: question.promptHtml }}
                  />
                </div>
              </div>

              {question.type === 'single_choice' || question.type === 'true_false' ? (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={answers[question.id] === option.id}
                        onChange={(e) => handleAnswerChange(question.id, question.type, e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-900">{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : question.type === 'multi_choice' ? (
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const selectedIds = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []
                    return (
                      <label
                        key={option.id}
                        className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.includes(option.id)}
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []
                            if (checked) {
                              handleAnswerChange(question.id, question.type, [...current, option.id])
                            } else {
                              handleAnswerChange(question.id, question.type, current.filter(id => id !== option.id))
                            }
                          }}
                        />
                        <span className="text-sm text-gray-900">{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              ) : question.type === 'short_answer' ? (
                <Input
                  type="text"
                  value={answers[question.id] as string || ''}
                  onChange={(e) => handleAnswerChange(question.id, question.type, e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full"
                />
              ) : null}
            </div>
          ))}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting || questions.length === 0}
              size="lg"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  Submit Quiz
                  <CheckCircle className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

