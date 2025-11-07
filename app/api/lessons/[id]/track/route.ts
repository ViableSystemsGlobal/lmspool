import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const trackSchema = z.object({
  timeSpentSec: z.number().min(0).optional(),
  incrementView: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await req.json()
    const data = trackSchema.parse(body)

    // Verify user is enrolled in the course
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
    const existing = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: BigInt(user.id),
          lessonId: BigInt(id),
        },
      },
    })

    const updateData: any = {
      lastViewedAt: new Date(),
      lastActivityAt: new Date(),
    }

    if (data.timeSpentSec !== undefined) {
      // Increment time spent
      updateData.timeSpentSec = {
        increment: data.timeSpentSec,
      }
    }

    if (data.incrementView) {
      // Increment view count
      updateData.attemptsCount = {
        increment: 1,
      }
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: BigInt(user.id),
          lessonId: BigInt(id),
        },
      },
      update: updateData,
      create: {
        userId: BigInt(user.id),
        lessonId: BigInt(id),
        status: 'seen',
        lastViewedAt: new Date(),
        lastActivityAt: new Date(),
        timeSpentSec: data.timeSpentSec || 0,
        attemptsCount: data.incrementView ? 1 : 0,
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

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      progress: {
        ...progress,
        id: progress.id.toString(),
        userId: progress.userId.toString(),
        lessonId: progress.lessonId.toString(),
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Track lesson error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

