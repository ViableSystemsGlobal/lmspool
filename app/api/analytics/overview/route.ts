import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const totalUsers = await prisma.user.count({
      where: {
        status: 'active',
        deactivatedAt: null,
      },
    })

    const totalCourses = await prisma.course.count({
      where: {
        status: 'published',
      },
    })

    const totalEnrollments = await prisma.enrollment.count()
    const completedEnrollments = await prisma.enrollment.count({
      where: {
        status: 'completed',
      },
    })

    const totalAssignments = await prisma.assignment.count()

    // Average completion rate
    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0

    // Courses with most enrollments
    const topCourses = await prisma.course.findMany({
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        enrollments: {
          _count: 'desc',
        },
      },
      take: 5,
    })

    // Calculate average time spent across all progress records
    const progressStats = await prisma.progress.aggregate({
      _sum: {
        timeSpentSec: true,
      },
      _avg: {
        timeSpentSec: true,
      },
      _count: {
        id: true,
      },
    })

    // Calculate average quiz scores
    const quizStats = await prisma.quizAttempt.aggregate({
      where: {
        submittedAt: { not: null },
      },
      _avg: {
        score: true,
      },
      _count: {
        id: true,
      },
    })

    // Get overdue enrollments count
    const overdueEnrollments = await prisma.enrollment.count({
      where: {
        dueAt: { 
          not: null,
          lt: new Date() 
        },
        status: { not: 'completed' },
      },
    })

    return NextResponse.json({
      overview: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        completedEnrollments,
        totalAssignments,
        completionRate,
        overdueEnrollments,
        averageTimeSpent: Math.round((progressStats._avg.timeSpentSec || 0) / 60), // Convert to minutes
        totalTimeSpent: Math.round((progressStats._sum.timeSpentSec || 0) / 60), // Convert to minutes
        totalProgressRecords: progressStats._count.id,
        averageQuizScore: quizStats._avg.score ? Math.round(quizStats._avg.score) : null,
        totalQuizAttempts: quizStats._count.id,
      },
      topCourses: topCourses.map(c => ({
        id: c.id.toString(),
        title: c.title,
        enrollments: c._count.enrollments,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Analytics overview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

