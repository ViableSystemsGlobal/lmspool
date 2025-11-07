import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    const { id } = await params

    const course = await prisma.course.findUnique({
      where: { id: BigInt(id) },
      include: {
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        quizzes: {
          include: {
            attempts: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const assigned = course.enrollments.length
    const started = course.enrollments.filter(e => e.status === 'started').length
    const completed = course.enrollments.filter(e => e.status === 'completed').length

    // Calculate average score from quiz attempts
    const allAttempts = course.quizzes.flatMap(q => q.attempts)
    const avgScore = allAttempts.length > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length)
      : null

    // Get all lesson IDs for this course
    const courseLessons = await prisma.module.findMany({
      where: { courseId: BigInt(id) },
      include: {
        lessons: {
          select: { id: true },
        },
      },
    })
    const lessonIds = courseLessons.flatMap(m => m.lessons.map(l => l.id))

    // Calculate progress metrics
    const progressStats = await prisma.progress.aggregate({
      where: {
        lessonId: { in: lessonIds },
      },
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

    // Calculate average time to completion
    const completedEnrollments = course.enrollments.filter(e => e.status === 'completed' && e.startedAt && e.completedAt)
    const avgTimeToComplete = completedEnrollments.length > 0
      ? completedEnrollments.reduce((sum, e) => {
          const timeDiff = new Date(e.completedAt!).getTime() - new Date(e.startedAt!).getTime()
          return sum + timeDiff
        }, 0) / completedEnrollments.length
      : null

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      course: {
        id: course.id.toString(),
        title: course.title,
      },
      metrics: {
        assigned,
        started,
        completed,
        completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
        averageScore: avgScore,
        averageTimeSpent: Math.round((progressStats._avg.timeSpentSec || 0) / 60), // minutes
        totalTimeSpent: Math.round((progressStats._sum.timeSpentSec || 0) / 60), // minutes
        totalProgressRecords: progressStats._count.id,
        averageTimeToComplete: avgTimeToComplete ? Math.round(avgTimeToComplete / (1000 * 60 * 60 * 24)) : null, // days
      },
      enrollments: course.enrollments.map(e => ({
        userId: e.userId.toString(),
        userName: e.user.name,
        userEmail: e.user.email,
        status: e.status,
        startedAt: e.startedAt?.toISOString() || null,
        completedAt: e.completedAt?.toISOString() || null,
        dueAt: e.dueAt?.toISOString() || null,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Course analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

