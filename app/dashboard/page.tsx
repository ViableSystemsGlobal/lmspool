"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"
import { useAuth } from "@/components/providers/auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  BookOpen, 
  Users, 
  FileText, 
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart3,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Target,
  Award,
  Calendar,
  UserCheck,
  Building,
  Settings
} from "lucide-react"
import Link from "next/link"

interface DashboardData {
  metrics: {
    totalCourses: number
    totalUsers: number
    totalEnrollments: number
    completedEnrollments: number
    totalAssignments: number
    completionRate: number
    overdueCount: number
  }
  myLearning?: {
    totalAssigned: number
    totalInProgress: number
    totalCompleted: number
    totalOverdue: number
    courses: Array<{
      enrollmentId: string
      courseId: string
      title: string
      description: string | null
      status: string
      progressPercentage: number
      totalLessons: number
      completedLessons: number
      dueAt: string | null
      mandatory: boolean
      completedAt: string | null
    }>
  }
  topCourses?: Array<{
    id: string
    title: string
    enrollments: number
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const { getThemeClasses, getThemeColor } = useTheme()
  const theme = getThemeClasses()
  const { user, loading: authLoading } = useAuth()
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.roles.some(r => r === 'ADMIN' || r === 'SUPER_ADMIN') || false
  const isManager = user?.roles.some(r => r === 'MANAGER') || isAdmin

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (authLoading || !user) return

        // Fetch admin analytics if admin
        if (isAdmin) {
          const analyticsRes = await fetch('/api/analytics/overview')
          if (analyticsRes.ok) {
            const analytics = await analyticsRes.json()
            
            // Calculate overdue enrollments
            const enrollmentsRes = await fetch('/api/portal/dashboard')
            let overdueCount = 0
            if (enrollmentsRes.ok) {
              const enrollments = await enrollmentsRes.json()
              overdueCount = enrollments.totalOverdue || 0
            }

            setDashboardData({
              metrics: {
                totalCourses: analytics.overview?.totalCourses || 0,
                totalUsers: analytics.overview?.totalUsers || 0,
                totalEnrollments: analytics.overview?.totalEnrollments || 0,
                completedEnrollments: analytics.overview?.completedEnrollments || 0,
                totalAssignments: analytics.overview?.totalAssignments || 0,
                completionRate: analytics.overview?.completionRate || 0,
                overdueCount
              },
              topCourses: analytics.topCourses || []
            })
          }
        }

        // Always fetch learner dashboard
        const learnerRes = await fetch('/api/portal/dashboard')
        if (learnerRes.ok) {
          const learnerData = await learnerRes.json()
          
          // If not admin, use learner data as primary metrics
          if (!isAdmin) {
            setDashboardData({
              metrics: {
                totalCourses: learnerData.totalAssigned || 0,
                totalUsers: 0,
                totalEnrollments: learnerData.totalAssigned || 0,
                completedEnrollments: learnerData.totalCompleted || 0,
                totalAssignments: learnerData.totalAssigned || 0,
                completionRate: learnerData.totalAssigned > 0 
                  ? Math.round((learnerData.totalCompleted / learnerData.totalAssigned) * 100)
                  : 0,
                overdueCount: learnerData.totalOverdue || 0
              },
              myLearning: learnerData
            })
          } else {
            // If admin, add learner data to existing data
            setDashboardData(prev => ({
              ...prev!,
              myLearning: learnerData
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [user, authLoading, isAdmin])

  const metrics = dashboardData?.metrics || {
    totalCourses: 0,
    totalUsers: 0,
    totalEnrollments: 0,
    completedEnrollments: 0,
    totalAssignments: 0,
    completionRate: 0,
    overdueCount: 0
  }

  const myLearning = dashboardData?.myLearning

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back{user?.name ? `, ${user.name}` : ''}! Here's what's happening with your learning today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/admin/courses')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
              <Button 
                size="sm"
                onClick={() => router.push('/admin/assignments')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Courses</CardTitle>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalCourses}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                  Published courses
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalUsers}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                  Active users
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Enrollments</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <GraduationCap className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalEnrollments}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  {metrics.completedEnrollments} completed ({metrics.completionRate}%)
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.overdueCount}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
                  Requires attention
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Assigned Courses</CardTitle>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalCourses}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                  Courses assigned to you
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{myLearning?.totalInProgress || 0}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Target className="h-3 w-3 mr-1 text-blue-500" />
                  Currently learning
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.completedEnrollments}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Award className="h-3 w-3 mr-1 text-green-500" />
                  {metrics.completionRate}% completion rate
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics.overdueCount}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
                  Requires attention
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Learning / Assigned Courses */}
        <Card className="border-0 shadow-sm bg-white lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Recent Enrollments' : 'My Learning'}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {isAdmin ? 'Latest course enrollments' : 'Your assigned courses and progress'}
                </CardDescription>
              </div>
              <Link href={isAdmin ? '/admin/assignments' : '/learn/dashboard'}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!myLearning || myLearning.courses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  {isAdmin ? 'Start by creating your first course' : 'No courses have been assigned to you yet'}
                </p>
                {isAdmin && (
                  <Button onClick={() => router.push('/admin/courses')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {myLearning.courses.slice(0, 5).map((course) => (
                  <Link
                    key={course.enrollmentId}
                    href={`/courses/${course.courseId}/player`}
                    className="block"
                  >
                    <div className="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <BookOpen className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            course.status === 'completed' 
                              ? 'bg-green-100 text-green-700'
                              : course.status === 'started'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {course.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {course.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center text-xs text-gray-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {course.completedLessons}/{course.totalLessons} lessons completed
                          </div>
                          {course.dueAt && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              Due {new Date(course.dueAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-600 transition-all"
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

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAdmin && (
              <>
                <Button 
                  className="w-full justify-start h-12 text-left" 
                  variant="outline"
                  onClick={() => router.push('/admin/courses')}
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-orange-50 rounded-lg mr-3">
                      <Plus className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Create Course</div>
                      <div className="text-sm text-gray-500">Add a new training course</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start h-12 text-left" 
                  variant="outline"
                  onClick={() => router.push('/admin/assignments')}
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-orange-50 rounded-lg mr-3">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Assign Course</div>
                      <div className="text-sm text-gray-500">Assign course to team</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start h-12 text-left" 
                  variant="outline"
                  onClick={() => router.push('/admin/users')}
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-orange-50 rounded-lg mr-3">
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Manage Users</div>
                      <div className="text-sm text-gray-500">Add or edit users</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start h-12 text-left" 
                  variant="outline"
                  onClick={() => router.push('/admin/analytics')}
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-orange-50 rounded-lg mr-3">
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">View Analytics</div>
                      <div className="text-sm text-gray-500">Check reports & insights</div>
                    </div>
                  </div>
                </Button>
              </>
            )}

            {isManager && (
              <Button 
                className="w-full justify-start h-12 text-left" 
                variant="outline"
                onClick={() => router.push('/manager/team')}
              >
                <div className="flex items-center w-full">
                  <div className="p-2 bg-orange-50 rounded-lg mr-3">
                    <Users className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">My Team</div>
                    <div className="text-sm text-gray-500">View team progress</div>
                  </div>
                </div>
              </Button>
            )}

            <Button 
              className="w-full justify-start h-12 text-left" 
              variant="outline"
              onClick={() => router.push('/learn/dashboard')}
            >
              <div className="flex items-center w-full">
                <div className="p-2 bg-orange-50 rounded-lg mr-3">
                  <GraduationCap className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">My Learning</div>
                  <div className="text-sm text-gray-500">View all courses</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top Courses (Admin only) */}
      {isAdmin && dashboardData?.topCourses && dashboardData.topCourses.length > 0 && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Top Courses</CardTitle>
            <CardDescription className="text-gray-600">
              Most enrolled courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.topCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <BookOpen className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{course.title}</h4>
                      <p className="text-xs text-gray-500">{course.enrollments} enrollments</p>
                    </div>
                  </div>
                  <Link href={`/admin/courses/${course.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
