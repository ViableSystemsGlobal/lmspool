'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Mail, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'

interface TeamMember {
  userId: string
  name: string
  email: string
  totalAssignments: number
  completed: number
  inProgress: number
  overdue: number
  completionRate: number
  totalTimeSpent: number
  totalLessonsCompleted: number
  averageQuizScore: number | null
  totalQuizAttempts: number
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/managers/me/team')
      .then(res => res.json())
      .then(data => {
        setTeam(data.team || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching team:', err)
        setLoading(false)
      })
  }, [])

  const totalMembers = team.length
  const totalAssignments = team.reduce((sum, m) => sum + m.totalAssignments, 0)
  const totalCompleted = team.reduce((sum, m) => sum + m.completed, 0)
  const totalOverdue = team.reduce((sum, m) => sum + m.overdue, 0)
  const totalTimeSpent = team.reduce((sum, m) => sum + m.totalTimeSpent, 0)
  const totalLessonsCompleted = team.reduce((sum, m) => sum + m.totalLessonsCompleted, 0)
  const avgCompletionRate = totalMembers > 0
    ? Math.round(team.reduce((sum, m) => sum + m.completionRate, 0) / totalMembers)
    : 0
  const avgQuizScore = team.filter(m => m.averageQuizScore !== null).length > 0
    ? Math.round(team.filter(m => m.averageQuizScore !== null).reduce((sum, m) => sum + (m.averageQuizScore || 0), 0) / team.filter(m => m.averageQuizScore !== null).length)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">My Team</h1>
        <p className="text-gray-600 mt-1">View and manage your team's learning progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Members</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{totalMembers}</div>
                <p className="text-xs text-gray-500 mt-1">Total team members</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Assignments</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{totalAssignments}</div>
                <p className="text-xs text-gray-500 mt-1">Across all members</p>
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
                <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
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
                <div className="text-2xl font-bold text-gray-900">{totalOverdue}</div>
                <p className="text-xs text-gray-500 mt-1">Require attention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${totalMembers} ${totalMembers === 1 ? 'member' : 'members'} • Avg completion: ${avgCompletionRate}% • Total time: ${totalTimeSpent} min`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
              <p className="text-gray-500 text-sm">You don't have any team members assigned to you yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overdue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {team.map((member) => (
                    <tr key={member.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-orange-600">
                              {member.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {member.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.totalAssignments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {member.completed > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {member.completed}
                            </span>
                          )}
                          {member.inProgress > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              <Clock className="h-3 w-3 mr-1" />
                              {member.inProgress}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-orange-600 h-2 rounded-full transition-all"
                              style={{ width: `${member.completionRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">{member.completionRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.overdue > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {member.overdue}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.totalTimeSpent} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.averageQuizScore !== null ? `${member.averageQuizScore}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
