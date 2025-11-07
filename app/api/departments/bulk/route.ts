import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkActionSchema = z.object({
  departmentIds: z.array(z.string()),
  action: z.enum(['delete']),
})

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await bulkActionSchema.parse(await req.json())
    const { departmentIds, action } = body

    if (action === 'delete') {
      // Check if any departments have members, children, or assignments
      const departments = await prisma.department.findMany({
        where: {
          id: {
            in: departmentIds.map(id => BigInt(id)),
          },
        },
        include: {
          _count: {
            select: {
              members: true,
              children: true,
              assignments: true,
            },
          },
        },
      })

      const invalidDepartments = departments.filter(
        dept => dept._count.members > 0 || dept._count.children > 0 || dept._count.assignments > 0
      )

      if (invalidDepartments.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete departments with members, children, or assignments',
            invalidDepartments: invalidDepartments.map(d => ({
              id: d.id.toString(),
              name: d.name,
            })),
          },
          { status: 400 }
        )
      }

      // Delete departments
      await prisma.department.deleteMany({
        where: {
          id: {
            in: departmentIds.map(id => BigInt(id)),
          },
        },
      })

      return NextResponse.json({
        success: true,
        deleted: departmentIds.length,
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

