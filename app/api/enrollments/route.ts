import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  dueAt: z.string().optional().nullable(),
  mandatory: z.boolean().default(false),
})

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

    const where: any = {}

    // Regular users can only see their own enrollments
    if (!currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN') && !currentUser.roles.includes('MANAGER')) {
      where.userId = BigInt(currentUser.id)
    } else if (userId) {
      where.userId = BigInt(userId)
    }

    if (courseId) {
      where.courseId = BigInt(courseId)
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedEnrollments = enrollments.map(enrollment => ({
      ...enrollment,
      id: enrollment.id.toString(),
      userId: enrollment.userId.toString(),
      courseId: enrollment.courseId.toString(),
      course: enrollment.course ? {
        ...enrollment.course,
        id: enrollment.course.id.toString(),
      } : null,
      user: enrollment.user ? {
        ...enrollment.user,
        id: enrollment.user.id.toString(),
      } : null,
      assignedViaAssignmentId: enrollment.assignedViaAssignmentId?.toString() || null,
      certificateId: enrollment.certificateId?.toString() || null,
    }))

    return NextResponse.json({ enrollments: serializedEnrollments })
  } catch (error: any) {
    console.error('Get enrollments error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const data = createSchema.parse(body)

    // Check if enrollment already exists
    const existing = await prisma.enrollment.findFirst({
      where: {
        userId: BigInt(data.userId),
        courseId: BigInt(data.courseId),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 400 }
      )
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: BigInt(data.userId),
        courseId: BigInt(data.courseId),
        status: 'assigned',
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        mandatory: data.mandatory,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedEnrollment = {
      ...enrollment,
      id: enrollment.id.toString(),
      userId: enrollment.userId.toString(),
      courseId: enrollment.courseId.toString(),
      course: enrollment.course ? {
        ...enrollment.course,
        id: enrollment.course.id.toString(),
      } : null,
      user: enrollment.user ? {
        ...enrollment.user,
        id: enrollment.user.id.toString(),
      } : null,
      assignedViaAssignmentId: enrollment.assignedViaAssignmentId?.toString() || null,
      certificateId: enrollment.certificateId?.toString() || null,
    }

    return NextResponse.json({ enrollment: serializedEnrollment })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Create enrollment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

