import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const lesson = await prisma.lesson.findUnique({
      where: { id: BigInt(id) },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    userId: BigInt(user.id),
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Check enrollment
    if (lesson.module.course.enrollments.length === 0) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    // Update or create progress
    await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: BigInt(user.id),
          lessonId: BigInt(id),
        },
      },
      update: {
        status: 'completed',
        lastViewedAt: new Date(),
        lastActivityAt: new Date(),
      },
      create: {
        userId: BigInt(user.id),
        lessonId: BigInt(id),
        status: 'completed',
        lastViewedAt: new Date(),
        lastActivityAt: new Date(),
      },
    })

    // Update enrollment status to started if it's still assigned
    const enrollment = lesson.module.course.enrollments[0]
    if (enrollment && enrollment.status === 'assigned') {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'started',
          startedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Complete lesson error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

