import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit, logAuditChange } from '@/lib/audit'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  passMark: z.number().min(0).max(100).optional(),
  difficulty: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.string().min(1).optional().nullable()
  ),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const course = await prisma.course.findUnique({
      where: { id: BigInt(id) },
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
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

    // Learners can only see published courses
    if (currentUser.roles.includes('LEARNER') && !currentUser.roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
      if (course.status !== 'published') {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({
      course: {
        ...course,
        id: course.id.toString(),
      },
    })
  } catch (error) {
    console.error('Get course error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const data = updateSchema.parse(body)

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    // Check if course exists
    const existing = await prisma.course.findUnique({
      where: { id: BigInt(id) },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.passMark !== undefined) updateData.passMark = data.passMark
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
    if (data.status !== undefined) updateData.status = data.status

    // Update course
    const course = await prisma.course.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    })

    // Log audit with changes
    await logAuditChange(
      currentUser ? BigInt(currentUser.id) : null,
      'course_update',
      'course',
      id,
      {
        title: existing.title,
        description: existing.description,
        category: existing.category,
        passMark: existing.passMark,
        difficulty: existing.difficulty,
        status: existing.status,
        imageUrl: existing.imageUrl,
      },
      {
        title: course.title,
        description: course.description,
        category: course.category,
        passMark: course.passMark,
        difficulty: course.difficulty,
        status: course.status,
        imageUrl: course.imageUrl,
      },
      req
    )

    // Convert response
    const courseResponse = {
      id: course.id.toString(),
      title: course.title,
      description: course.description,
      category: course.category,
      passMark: course.passMark,
      status: course.status,
      difficulty: course.difficulty,
      estimatedDurationMin: course.estimatedDurationMin,
      tags: course.tags,
      imageUrl: course.imageUrl,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      _count: course._count,
    }

    return NextResponse.json({ course: courseResponse })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 })
    }
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({
        error: error.message
      }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    
    console.error('Course update error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const course = await prisma.course.findUnique({
      where: { id: BigInt(id) },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Log audit before deletion
    await logAudit(
      currentUser ? BigInt(currentUser.id) : null,
      'course_delete',
      'course',
      id,
      req,
      { title: course.title, status: course.status }
    )

    await prisma.course.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({
        error: error.message
      }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    
    console.error('Course delete error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}