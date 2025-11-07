import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit, logAuditChange } from '@/lib/audit'

const updateSchema = z.object({
  dueAt: z.string().optional(), // ISO string
  graceDays: z.number().optional(),
  mandatory: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    const { id } = await params

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const body = await req.json()
    const data = updateSchema.parse(body)

    // Get existing assignment for audit logging
    const existing = await prisma.assignment.findUnique({
      where: { id: BigInt(id) },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (data.dueAt !== undefined) {
      updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null
    }
    if (data.graceDays !== undefined) updateData.graceDays = data.graceDays
    if (data.mandatory !== undefined) updateData.mandatory = data.mandatory

    const assignment = await prisma.assignment.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update enrollments if due date changed
    if (data.dueAt !== undefined) {
      await prisma.enrollment.updateMany({
        where: {
          assignedViaAssignmentId: BigInt(id),
        },
        data: {
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
        },
      })
    }

    // Log audit with changes
    await logAuditChange(
      currentUser ? BigInt(currentUser.id) : null,
      'assignment_update',
      'assignment',
      id,
      {
        dueAt: existing.dueAt?.toISOString() || null,
        graceDays: existing.graceDays,
        mandatory: existing.mandatory,
      },
      {
        dueAt: assignment.dueAt?.toISOString() || null,
        graceDays: assignment.graceDays,
        mandatory: assignment.mandatory,
      },
      req
    )

    // Convert BigInt IDs to strings for JSON serialization
    const serializedAssignment = {
      ...assignment,
      id: assignment.id.toString(),
      courseId: assignment.courseId.toString(),
      assignedById: assignment.assignedById.toString(),
      course: assignment.course ? {
        ...assignment.course,
        id: assignment.course.id.toString(),
      } : null,
      assignedBy: assignment.assignedBy ? {
        ...assignment.assignedBy,
        id: assignment.assignedBy.id.toString(),
      } : null,
    }

    return NextResponse.json({ assignment: serializedAssignment })
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
    console.error('Update assignment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    // Get current user and existing assignment for audit logging
    const currentUser = await getCurrentUser()
    const existing = await prisma.assignment.findUnique({
      where: { id: BigInt(id) },
      select: {
        courseId: true,
      },
    })

    // Delete assignment targets first
    await prisma.assignmentTarget.deleteMany({
      where: { assignmentId: BigInt(id) },
    })

    // Log audit before deletion
    if (existing) {
      await logAudit(
        currentUser ? BigInt(currentUser.id) : null,
        'assignment_delete',
        'assignment',
        id,
        req,
        { courseId: existing.courseId.toString() }
      )
    }

    // Delete assignment
    await prisma.assignment.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Delete assignment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

