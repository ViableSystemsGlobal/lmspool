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
    const courseId = searchParams.get('courseId')
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status') // assigned|started|completed|overdue|all
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

    // Get course enrollments
    const where: any = {}

    if (courseId) {
      where.courseId = BigInt(courseId)
    }

    if (status && status !== 'all') {
      if (status === 'overdue') {
        where.status = { not: 'completed' }
        where.dueAt = { lt: new Date() }
      } else {
        where.status = status
      }
    }

    // Filter by department if specified or if manager
    if (departmentId || managerDepartmentId) {
      const deptId = departmentId ? BigInt(departmentId) : managerDepartmentId
      where.user = {
        departmentId: deptId,
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        user: {
          include: {
            department: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get quiz scores for each enrollment
    const reportData = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get best quiz score
        const quizAttempt = await prisma.quizAttempt.findFirst({
          where: {
            userId: enrollment.userId,
            quiz: {
              courseId: enrollment.courseId,
            },
            submittedAt: { not: null },
          },
          orderBy: [
            { score: 'desc' },
            { attemptNo: 'desc' },
          ],
          include: {
            quiz: {
              select: {
                questions: {
                  select: {
                    points: true,
                  },
                },
              },
            },
          },
        })

        // Calculate total possible points
        const maxScore = quizAttempt?.quiz.questions.reduce((sum, q) => sum + q.points, 0) || 0

        // Get progress
        const course = await prisma.course.findUnique({
          where: { id: enrollment.courseId },
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        })

        const totalLessons = course?.modules.flatMap(m => m.lessons).length || 0
        const completedLessons = await prisma.progress.count({
          where: {
            userId: enrollment.userId,
            lessonId: {
              in: course?.modules.flatMap(m => m.lessons.map(l => l.id)) || [],
            },
            status: 'completed',
          },
        })

        const progressPercentage = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0

        // Calculate time spent
        const progressStats = await prisma.progress.aggregate({
          where: {
            userId: enrollment.userId,
            lessonId: {
              in: course?.modules.flatMap(m => m.lessons.map(l => l.id)) || [],
            },
          },
          _sum: {
            timeSpentSec: true,
          },
        })

        return {
          userId: enrollment.userId.toString(),
          userName: enrollment.user.name,
          userEmail: enrollment.user.email,
          department: enrollment.user.department?.name || 'N/A',
          courseId: enrollment.courseId.toString(),
          courseTitle: enrollment.course.title,
          courseCategory: enrollment.course.category || 'N/A',
          status: enrollment.status,
          progressPercentage,
          totalLessons,
          completedLessons,
          timeSpentMinutes: Math.round((progressStats._sum.timeSpentSec || 0) / 60),
          score: quizAttempt?.score || null,
          maxScore: maxScore || null,
          percentage: quizAttempt && maxScore > 0
            ? Math.round((quizAttempt.score / maxScore) * 100)
            : null,
          startedAt: enrollment.startedAt?.toISOString() || null,
          completedAt: enrollment.completedAt?.toISOString() || null,
          dueAt: enrollment.dueAt?.toISOString() || null,
          isOverdue: enrollment.dueAt && new Date(enrollment.dueAt) < new Date() && enrollment.status !== 'completed',
        }
      })
    )

    // If CSV format requested
    if (format === 'csv') {
      const csvHeaders = [
        'User Name',
        'Email',
        'Department',
        'Course Title',
        'Category',
        'Status',
        'Progress %',
        'Lessons Completed',
        'Total Lessons',
        'Time Spent (minutes)',
        'Quiz Score',
        'Max Score',
        'Score %',
        'Started At',
        'Completed At',
        'Due Date',
        'Overdue',
      ].join(',')

      const csvRows = reportData.map(row => [
        `"${row.userName}"`,
        `"${row.userEmail}"`,
        `"${row.department}"`,
        `"${row.courseTitle}"`,
        `"${row.courseCategory}"`,
        `"${row.status}"`,
        row.progressPercentage,
        row.completedLessons,
        row.totalLessons,
        row.timeSpentMinutes,
        row.score || '',
        row.maxScore || '',
        row.percentage || '',
        row.startedAt || '',
        row.completedAt || '',
        row.dueAt || '',
        row.isOverdue ? 'Yes' : 'No',
      ].join(','))

      const csvContent = [csvHeaders, ...csvRows].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="course-report-${Date.now()}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      report: 'Course Completion Report',
      totalRecords: reportData.length,
      data: reportData,
      summary: {
        totalAssigned: reportData.length,
        totalStarted: reportData.filter(r => r.status === 'started').length,
        totalCompleted: reportData.filter(r => r.status === 'completed').length,
        totalOverdue: reportData.filter(r => r.isOverdue).length,
        averageProgress: reportData.length > 0
          ? Math.round(reportData.reduce((sum, r) => sum + r.progressPercentage, 0) / reportData.length)
          : 0,
        averageScore: reportData.filter(r => r.percentage !== null).length > 0
          ? Math.round(
              reportData.filter(r => r.percentage !== null).reduce((sum, r) => sum + (r.percentage || 0), 0) /
              reportData.filter(r => r.percentage !== null).length
            )
          : null,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Course report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

