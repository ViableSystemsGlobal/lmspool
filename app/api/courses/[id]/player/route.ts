import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: BigInt(user.id),
        courseId: BigInt(id),
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    // Get course with all content
    const course = await prisma.course.findUnique({
      where: { id: BigInt(id) },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                progress: {
                  where: {
                    userId: BigInt(user.id),
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        quizzes: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
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

    // Calculate overall progress
    const allLessons = course.modules.flatMap(m => m.lessons)
    const completedLessons = allLessons.filter(l =>
      l.progress.some(p => p.status === 'completed')
    )

    const progress = {
      total: allLessons.length,
      completed: completedLessons.length,
      percentage: allLessons.length > 0
        ? Math.round((completedLessons.length / allLessons.length) * 100)
        : 0,
    }

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      course: {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        progress,
        enrollment: {
          id: enrollment.id.toString(),
          status: enrollment.status,
          startedAt: enrollment.startedAt?.toISOString() || null,
          completedAt: enrollment.completedAt?.toISOString() || null,
          dueAt: enrollment.dueAt?.toISOString() || null,
        },
      },
      modules: course.modules.map(module => ({
        id: module.id.toString(),
        title: module.title,
        order: module.order,
        lessons: module.lessons.map(lesson => ({
          id: lesson.id.toString(),
          type: lesson.type,
          title: lesson.title,
          contentUrl: lesson.contentUrl,
          contentHtml: lesson.contentHtml,
          durationMin: lesson.durationMin,
          order: lesson.order,
          completed: lesson.progress.some(p => p.status === 'completed'),
        })),
      })),
      quizzes: course.quizzes.map(quiz => ({
        id: quiz.id.toString(),
        timeLimitSec: quiz.timeLimitSec,
        attemptsAllowed: quiz.attemptsAllowed,
        randomize: quiz.randomize,
        passMarkOverride: quiz.passMarkOverride,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get course player error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

