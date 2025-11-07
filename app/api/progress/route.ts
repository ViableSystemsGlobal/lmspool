import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth'
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
    const courseId = searchParams.get('courseId')
    const lessonId = searchParams.get('lessonId')

    // Regular users can only see their own progress
    if (!currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN') && !currentUser.roles.includes('MANAGER')) {
      if (userId && userId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    const where: any = {}

    if (userId) {
      where.userId = BigInt(userId)
    } else {
      where.userId = BigInt(currentUser.id)
    }

    if (courseId) {
      // Get all lessons for this course
      const courseLessons = await prisma.module.findMany({
        where: { courseId: BigInt(courseId) },
        include: {
          lessons: {
            select: { id: true },
          },
        },
      })
      const lessonIds = courseLessons.flatMap(m => m.lessons.map(l => l.id))
      where.lessonId = { in: lessonIds }
    }

    if (lessonId) {
      where.lessonId = BigInt(lessonId)
    }

    const progress = await prisma.progress.findMany({
      where,
      include: {
        lesson: {
          include: {
            module: {
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
        },
      },
      orderBy: {
        lastViewedAt: 'desc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedProgress = progress.map(p => ({
      ...p,
      id: p.id.toString(),
      userId: p.userId.toString(),
      lessonId: p.lessonId.toString(),
      lesson: p.lesson ? {
        ...p.lesson,
        id: p.lesson.id.toString(),
        moduleId: p.lesson.moduleId.toString(),
        module: p.lesson.module ? {
          ...p.lesson.module,
          id: p.lesson.module.id.toString(),
          courseId: p.lesson.module.courseId.toString(),
          course: p.lesson.module.course ? {
            ...p.lesson.module.course,
            id: p.lesson.module.course.id.toString(),
          } : null,
        } : null,
      } : null,
    }))

    return NextResponse.json({ progress: serializedProgress })
  } catch (error: any) {
    console.error('Get progress error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

