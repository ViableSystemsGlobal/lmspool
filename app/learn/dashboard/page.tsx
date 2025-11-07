'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Clock, CheckCircle, AlertCircle, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Course {
  enrollmentId: string
  courseId: string
  title: string
  description: string | null
  imageUrl: string | null
  status: string
  progressPercentage: number
  totalLessons: number
  completedLessons: number
  dueAt: string | null
  mandatory: boolean
  completedAt: string | null
}

export default function LearnerDashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ 
    totalAssigned: 0, 
    totalInProgress: 0, 
    totalCompleted: 0, 
    totalOverdue: 0 
  })

  useEffect(() => {
    fetch('/api/portal/dashboard')
      .then(res => res.json())
      .then(data => {
        console.log('Dashboard response:', data)
        setCourses(data.courses || [])
        setStats({
          totalAssigned: data.totalAssigned || 0,
          totalInProgress: data.totalInProgress || 0,
          totalCompleted: data.totalCompleted || 0,
          totalOverdue: data.totalOverdue || 0,
        })
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching dashboard:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">My Learning</h1>
        <p className="text-gray-600 mt-1">Your assigned courses and progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Assigned</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.totalAssigned}</div>
                <p className="text-xs text-gray-500 mt-1">Total courses assigned</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.totalInProgress}</div>
                <p className="text-xs text-gray-500 mt-1">Currently learning</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.totalCompleted}</div>
                <p className="text-xs text-gray-500 mt-1">Successfully completed</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.totalOverdue}</div>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'} assigned to you`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses assigned yet</h3>
              <p className="text-gray-500 text-sm">You'll see assigned courses here once they're available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <Link
                  key={course.enrollmentId}
                  href={`/courses/${course.courseId}/player`}
                  className="block"
                >
                  <div className="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image on error
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            // Show fallback
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) {
                              fallback.style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 w-full h-full flex items-center justify-center bg-orange-50 ${course.imageUrl ? 'hidden' : 'flex'}`}>
                        <BookOpen className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </h4>
                          {course.description && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <span className={`ml-4 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          course.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : course.status === 'started'
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {course.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {course.completedLessons}/{course.totalLessons} lessons
                          </div>
                          {course.dueAt && (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Due {new Date(course.dueAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-orange-600">
                          {course.progressPercentage}%
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all"
                            style={{ width: `${course.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
