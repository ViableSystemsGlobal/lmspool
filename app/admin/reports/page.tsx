'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Download, BookOpen, Users, Shield, TrendingUp } from 'lucide-react'
import { Select } from '@/components/ui/select'

interface ReportSummary {
  totalRecords: number
  summary: {
    totalAssigned?: number
    totalStarted?: number
    totalCompleted?: number
    totalOverdue?: number
    averageProgress?: number
    averageScore?: number | null
    totalLearners?: number
    totalAssignments?: number
    averageCompletionRate?: number
    averageTimeSpent?: number
    totalMandatory?: number
    totalDueSoon?: number
    complianceRate?: number
  }
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<'courses' | 'learners' | 'compliance'>('courses')
  const [courseId, setCourseId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState<'all' | 'assigned' | 'started' | 'completed' | 'overdue'>('all')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    fetchCourses()
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (selectedReport) {
      fetchReport()
    }
  }, [selectedReport, courseId, departmentId, status])

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses')
      const data = await res.json()
      setCourses(data.courses || [])
    } catch (err) {
      console.error('Error fetching courses:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(data.departments || [])
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      let url = ''
      if (selectedReport === 'courses') {
        url = '/api/reports/courses?'
        if (courseId) url += `courseId=${courseId}&`
        if (departmentId) url += `departmentId=${departmentId}&`
        if (status !== 'all') url += `status=${status}&`
      } else if (selectedReport === 'learners') {
        url = '/api/reports/learners?'
        if (departmentId) url += `departmentId=${departmentId}&`
      } else if (selectedReport === 'compliance') {
        url = '/api/reports/compliance?'
        if (departmentId) url += `departmentId=${departmentId}&`
      }

      const res = await fetch(url)
      const data = await res.json()
      setReportData(data.data || [])
      setSummary({
        totalRecords: data.totalRecords || 0,
        summary: data.summary || {},
      })
    } catch (err) {
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    let url = ''
    if (selectedReport === 'courses') {
      url = '/api/reports/courses?format=csv'
      if (courseId) url += `&courseId=${courseId}`
      if (departmentId) url += `&departmentId=${departmentId}`
      if (status !== 'all') url += `&status=${status}`
    } else if (selectedReport === 'learners') {
      url = '/api/reports/learners?format=csv'
      if (departmentId) url += `&departmentId=${departmentId}`
    } else if (selectedReport === 'compliance') {
      url = '/api/reports/compliance?format=csv'
      if (departmentId) url += `&departmentId=${departmentId}`
    }

    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Generate and export comprehensive learning reports</p>
      </div>

      {/* Report Type Selection */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Report Type</CardTitle>
          <CardDescription>Select the type of report you want to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedReport('courses')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                selectedReport === 'courses'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <BookOpen className={`h-6 w-6 mb-2 ${selectedReport === 'courses' ? 'text-orange-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900 mb-1">Course Completion</h3>
              <p className="text-sm text-gray-600">Track course progress, completion rates, and scores</p>
            </button>

            <button
              onClick={() => setSelectedReport('learners')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                selectedReport === 'learners'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Users className={`h-6 w-6 mb-2 ${selectedReport === 'learners' ? 'text-orange-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900 mb-1">Learner Activity</h3>
              <p className="text-sm text-gray-600">View learner engagement, time spent, and activity</p>
            </button>

            <button
              onClick={() => setSelectedReport('compliance')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                selectedReport === 'compliance'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Shield className={`h-6 w-6 mb-2 ${selectedReport === 'compliance' ? 'text-orange-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900 mb-1">Compliance Status</h3>
              <p className="text-sm text-gray-600">Monitor mandatory training and certification status</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine your report data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedReport === 'courses' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedReport === 'courses' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="assigned">Assigned</option>
                  <option value="started">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button onClick={handleExport} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Records</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-900">{summary.totalRecords}</div>
                  <p className="text-xs text-gray-500 mt-1">Records in report</p>
                </>
              )}
            </CardContent>
          </Card>

          {selectedReport === 'courses' && summary.summary.totalCompleted !== undefined && (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.totalCompleted || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">Completed courses</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.totalOverdue || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">Overdue assignments</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Progress</CardTitle>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.averageProgress || 0}%</div>
                      <p className="text-xs text-gray-500 mt-1">Average completion</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {selectedReport === 'learners' && summary.summary.totalLearners !== undefined && (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Learners</CardTitle>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.totalLearners || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">Active learners</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Completion</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.averageCompletionRate || 0}%</div>
                      <p className="text-xs text-gray-500 mt-1">Average completion rate</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Time</CardTitle>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.averageTimeSpent || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">Minutes spent</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {selectedReport === 'compliance' && summary.summary.totalMandatory !== undefined && (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Mandatory</CardTitle>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Shield className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.totalMandatory || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">Mandatory assignments</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Compliance Rate</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.complianceRate || 0}%</div>
                      <p className="text-xs text-gray-500 mt-1">Completion rate</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gray-900">{summary.summary.totalOverdue || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">Overdue assignments</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Report Data Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Data</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${reportData.length} ${reportData.length === 1 ? 'record' : 'records'}`}
              </CardDescription>
            </div>
            <Button onClick={handleExport} disabled={loading || reportData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters or select a different report type</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectedReport === 'courses' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      </>
                    )}
                    {selectedReport === 'learners' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Spent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                      </>
                    )}
                    {selectedReport === 'compliance' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Until Due</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {selectedReport === 'courses' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.userName}</div>
                              <div className="text-xs text-gray-500">{row.userEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{row.courseTitle}</div>
                            <div className="text-xs text-gray-500">{row.courseCategory}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.status === 'completed' ? 'bg-green-100 text-green-700' :
                              row.status === 'started' ? 'bg-blue-100 text-blue-700' :
                              row.isOverdue ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-orange-600 h-2 rounded-full"
                                  style={{ width: `${row.progressPercentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-500">{row.progressPercentage}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.percentage !== null ? `${row.percentage}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '-'}
                          </td>
                        </>
                      )}
                      {selectedReport === 'learners' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.userName}</div>
                              <div className="text-xs text-gray-500">{row.userEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalAssignments}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.completedAssignments}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-orange-600 h-2 rounded-full"
                                  style={{ width: `${row.completionRate}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-500">{row.completionRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalTimeSpentMinutes} min</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString() : '-'}
                          </td>
                        </>
                      )}
                      {selectedReport === 'compliance' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.userName}</div>
                              <div className="text-xs text-gray-500">{row.userEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{row.courseTitle}</div>
                            <div className="text-xs text-gray-500">{row.courseCategory}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.status === 'completed' ? 'bg-green-100 text-green-700' :
                              row.isOverdue ? 'bg-red-100 text-red-700' :
                              row.isDueSoon ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.daysUntilDue !== null ? (
                              <span className={row.daysUntilDue < 0 ? 'text-red-600 font-semibold' : row.daysUntilDue < 7 ? 'text-yellow-600 font-semibold' : ''}>
                                {row.daysUntilDue} days
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.certificateNumber || '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 50 && (
                <div className="px-6 py-4 text-center text-sm text-gray-500">
                  Showing first 50 of {reportData.length} records. Export CSV to see all data.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

