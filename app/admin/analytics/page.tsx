'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Users, BookOpen, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalUsers: number
    totalCourses: number
    totalEnrollments: number
    completedEnrollments: number
    totalAssignments: number
    completionRate: number
    overdueEnrollments: number
    averageTimeSpent: number
    totalTimeSpent: number
    totalProgressRecords: number
    averageQuizScore: number | null
    totalQuizAttempts: number
  }
  topCourses: Array<{
    id: string
    title: string
    enrollments: number
  }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching analytics:', err)
        setLoading(false)
      })
  }, [])

  const overview = data?.overview || {
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    completedEnrollments: 0,
    totalAssignments: 0,
    completionRate: 0,
    overdueEnrollments: 0,
    averageTimeSpent: 0,
    totalTimeSpent: 0,
    totalProgressRecords: 0,
    averageQuizScore: null,
    totalQuizAttempts: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Overview of learning metrics and performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="text-2xl font-bold text-gray-900">{overview.overdueEnrollments}</div>
                <p className="text-xs text-gray-500 mt-1">Overdue enrollments</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{overview.totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Active users in system</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Courses</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{overview.totalCourses}</div>
                <p className="text-xs text-gray-500 mt-1">Published courses</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Enrollments</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{overview.totalEnrollments}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {overview.completedEnrollments} completed ({overview.completionRate}%)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{overview.completionRate}%</div>
                <p className="text-xs text-gray-500 mt-1">Overall completion rate</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Time Spent</CardTitle>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{overview.totalTimeSpent}</div>
                <p className="text-xs text-gray-500 mt-1">Minutes across all lessons</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Time Per Lesson</CardTitle>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Clock className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{overview.averageTimeSpent}</div>
                <p className="text-xs text-gray-500 mt-1">Minutes per lesson</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Quiz Score</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {overview.averageQuizScore !== null ? `${overview.averageQuizScore}%` : '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {overview.totalQuizAttempts} {overview.totalQuizAttempts === 1 ? 'attempt' : 'attempts'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Courses */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Top Courses</CardTitle>
          <CardDescription>Most enrolled courses</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.topCourses && data.topCourses.length > 0 ? (
            <div className="space-y-3">
              {data.topCourses.map((course, idx) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{course.title}</h4>
                      <p className="text-xs text-gray-500">{course.enrollments} enrollments</p>
                    </div>
                  </div>
                  <BookOpen className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No course data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
