import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const departmentId = searchParams.get('departmentId')
    const format = searchParams.get('format') // json|csv

    // Managers can only see their team's data
    const isManager = currentUser.roles.includes('MANAGER') && !currentUser.roles.includes('ADMIN')
    let managerDepartmentId: bigint | null = null

    if (isManager) {
      const manager = await prisma.user.findUnique({
        where: { id: BigInt(currentUser.id) },
        include: { managedDepartment: true },
      })
      managerDepartmentId = manager?.managedDepartment?.id || null
    }

    // Get users
    const where: any = {
      status: 'active',
      deactivatedAt: null,
    }

    if (userId) {
      where.id = BigInt(userId)
    }

    if (departmentId || managerDepartmentId) {
      const deptId = departmentId ? BigInt(departmentId) : managerDepartmentId
      where.departmentId = deptId
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        department: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get activity data for each user
    const reportData = await Promise.all(
      users.map(async (user) => {
        // Get progress stats
        const progressStats = await prisma.progress.aggregate({
          where: {
            userId: user.id,
          },
          _sum: {
            timeSpentSec: true,
          },
          _count: {
            id: true,
          },
        })

        // Get quiz stats
        const quizStats = await prisma.quizAttempt.aggregate({
          where: {
            userId: user.id,
            submittedAt: { not: null },
          },
          _avg: {
            score: true,
          },
          _count: {
            id: true,
          },
        })

        const enrollments = user.enrollments
        const totalAssignments = enrollments.length
        const completedAssignments = enrollments.filter(e => e.status === 'completed').length
        const inProgressAssignments = enrollments.filter(e => e.status === 'started').length
        const overdueAssignments = enrollments.filter(e => {
          if (!e.dueAt) return false
          return new Date(e.dueAt) < new Date() && e.status !== 'completed'
        }).length

        // Get last activity
        const lastProgress = await prisma.progress.findFirst({
          where: {
            userId: user.id,
          },
          orderBy: {
            lastViewedAt: 'desc',
          },
        })

        return {
          userId: user.id.toString(),
          userName: user.name,
          userEmail: user.email,
          department: user.department?.name || 'N/A',
          jobTitle: user.jobTitle || 'N/A',
          totalAssignments,
          completedAssignments,
          inProgressAssignments,
          overdueAssignments,
          completionRate: totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
          totalLessonsCompleted: progressStats._count.id,
          totalTimeSpentMinutes: Math.round((progressStats._sum.timeSpentSec || 0) / 60),
          averageQuizScore: quizStats._avg.score ? Math.round(quizStats._avg.score) : null,
          totalQuizAttempts: quizStats._count.id,
          lastActivityAt: lastProgress?.lastViewedAt?.toISOString() || null,
        }
      })
    )

    // If CSV format requested
    if (format === 'csv') {
      const csvHeaders = [
        'User Name',
        'Email',
        'Department',
        'Job Title',
        'Total Assignments',
        'Completed',
        'In Progress',
        'Overdue',
        'Completion Rate %',
        'Lessons Completed',
        'Time Spent (minutes)',
        'Avg Quiz Score',
        'Total Quiz Attempts',
        'Last Activity',
      ].join(',')

      const csvRows = reportData.map(row => [
        `"${row.userName}"`,
        `"${row.userEmail}"`,
        `"${row.department}"`,
        `"${row.jobTitle}"`,
        row.totalAssignments,
        row.completedAssignments,
        row.inProgressAssignments,
        row.overdueAssignments,
        row.completionRate,
        row.totalLessonsCompleted,
        row.totalTimeSpentMinutes,
        row.averageQuizScore || '',
        row.totalQuizAttempts,
        row.lastActivityAt || '',
      ].join(','))

      const csvContent = [csvHeaders, ...csvRows].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="learner-report-${Date.now()}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      report: 'Learner Activity Report',
      totalRecords: reportData.length,
      data: reportData,
      summary: {
        totalLearners: reportData.length,
        totalAssignments: reportData.reduce((sum, r) => sum + r.totalAssignments, 0),
        totalCompleted: reportData.reduce((sum, r) => sum + r.completedAssignments, 0),
        totalOverdue: reportData.reduce((sum, r) => sum + r.overdueAssignments, 0),
        averageCompletionRate: reportData.length > 0
          ? Math.round(reportData.reduce((sum, r) => sum + r.completionRate, 0) / reportData.length)
          : 0,
        averageTimeSpent: reportData.length > 0
          ? Math.round(reportData.reduce((sum, r) => sum + r.totalTimeSpentMinutes, 0) / reportData.length)
          : 0,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Learner report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

