import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkActionSchema = z.object({
  assignmentIds: z.array(z.string()),
  action: z.enum(['delete', 'extend']),
  extendDays: z.number().optional(), // For extend action
})

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await bulkActionSchema.parse(await req.json())
    const { assignmentIds, action, extendDays } = body

    const assignmentIdsBigInt = assignmentIds.map(id => BigInt(id))

    if (action === 'delete') {
      // Delete assignment targets first
      await prisma.assignmentTarget.deleteMany({
        where: {
          assignmentId: {
            in: assignmentIdsBigInt,
          },
        },
      })

      // Delete assignments
      await prisma.assignment.deleteMany({
        where: {
          id: {
            in: assignmentIdsBigInt,
          },
        },
      })

      return NextResponse.json({
        success: true,
        deleted: assignmentIds.length,
      })
    }

    if (action === 'extend') {
      if (!extendDays || extendDays <= 0) {
        return NextResponse.json(
          { error: 'extendDays must be a positive number' },
          { status: 400 }
        )
      }

      // Get assignments to extend
      const assignments = await prisma.assignment.findMany({
        where: {
          id: {
            in: assignmentIdsBigInt,
          },
        },
      })

      // Update each assignment's due date
      for (const assignment of assignments) {
        if (assignment.dueAt) {
          const newDueAt = new Date(assignment.dueAt)
          newDueAt.setDate(newDueAt.getDate() + extendDays)

          await prisma.assignment.update({
            where: { id: assignment.id },
            data: { dueAt: newDueAt },
          })

          // Update enrollments
          await prisma.enrollment.updateMany({
            where: {
              assignedViaAssignmentId: assignment.id,
            },
            data: {
              dueAt: newDueAt,
            },
          })
        }
      }

      return NextResponse.json({
        success: true,
        extended: assignmentIds.length,
        extendDays,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
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
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

