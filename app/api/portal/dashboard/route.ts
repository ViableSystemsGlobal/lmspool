import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    console.log('Portal Dashboard - User ID:', user.id)

    // Get user's enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: BigInt(user.id),
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
            quizzes: true,
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('Portal Dashboard - Found enrollments:', enrollments.length)

    // Calculate progress for each enrollment
    const courses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalLessons = enrollment.course.modules.reduce(
          (sum, mod) => sum + mod.lessons.length,
          0
        )

        const completedLessons = await prisma.progress.count({
          where: {
            userId: BigInt(user.id),
            lessonId: {
              in: enrollment.course.modules.flatMap(m => m.lessons.map(l => l.id)),
            },
            status: 'completed',
          },
        })

        const progressPercentage = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0

        return {
          enrollmentId: enrollment.id.toString(),
          courseId: enrollment.course.id.toString(),
          title: enrollment.course.title,
          description: enrollment.course.description,
          imageUrl: enrollment.course.imageUrl,
          status: enrollment.status,
          progressPercentage,
          totalLessons,
          completedLessons,
          dueAt: enrollment.dueAt?.toISOString(),
          mandatory: enrollment.mandatory,
          completedAt: enrollment.completedAt?.toISOString(),
        }
      })
    )

    return NextResponse.json({
      courses,
      totalAssigned: enrollments.length,
      totalInProgress: enrollments.filter(e => e.status === 'started').length,
      totalCompleted: enrollments.filter(e => e.status === 'completed').length,
      totalOverdue: enrollments.filter(e => {
        if (!e.dueAt) return false
        return new Date(e.dueAt) < new Date() && e.status !== 'completed'
      }).length,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

