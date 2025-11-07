import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  parentId: z.string().optional(),
  managerUserId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN', 'MANAGER')

    const departments = await prisma.department.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedDepartments = departments.map(dept => ({
      ...dept,
      id: dept.id.toString(),
      parentId: dept.parentId?.toString() || null,
      managerUserId: dept.managerUserId?.toString() || null,
      manager: dept.manager ? {
        ...dept.manager,
        id: dept.manager.id.toString(),
      } : null,
      parent: dept.parent ? {
        ...dept.parent,
        id: dept.parent.id.toString(),
      } : null,
    }))

    return NextResponse.json({ departments: serializedDepartments })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get departments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const data = createSchema.parse(body)

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const department = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code,
        parentId: data.parentId ? BigInt(data.parentId) : undefined,
        managerUserId: data.managerUserId ? BigInt(data.managerUserId) : undefined,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Log audit
    await logAudit(
      currentUser ? BigInt(currentUser.id) : null,
      'department_create',
      'department',
      department.id.toString(),
      req,
      { name: department.name, managerUserId: department.managerUserId?.toString() }
    )

    // Convert BigInt IDs to strings for JSON serialization
    const serializedDepartment = {
      ...department,
      id: department.id.toString(),
      parentId: department.parentId?.toString() || null,
      managerUserId: department.managerUserId?.toString() || null,
      manager: department.manager ? {
        ...department.manager,
        id: department.manager.id.toString(),
      } : null,
      parent: department.parent ? {
        ...department.parent,
        id: department.parent.id.toString(),
      } : null,
    }

    return NextResponse.json({ department: serializedDepartment })
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
    console.error('Create department error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

