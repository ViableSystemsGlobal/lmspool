import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit, logAuditChange } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  parentId: z.string().optional(),
  managerUserId: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const body = await req.json()
    const data = updateSchema.parse(body)

    // Get existing department for audit logging
    const existing = await prisma.department.findUnique({
      where: { id: BigInt(id) },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.code !== undefined) updateData.code = data.code
    if (data.parentId !== undefined) {
      updateData.parentId = data.parentId ? BigInt(data.parentId) : null
    }
    if (data.managerUserId !== undefined) {
      updateData.managerUserId = data.managerUserId ? BigInt(data.managerUserId) : null
    }

    const department = await prisma.department.update({
      where: { id: BigInt(id) },
      data: updateData,
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

    // Log audit with changes
    await logAuditChange(
      currentUser ? BigInt(currentUser.id) : null,
      'department_update',
      'department',
      id,
      {
        name: existing.name,
        code: existing.code,
        parentId: existing.parentId?.toString(),
        managerUserId: existing.managerUserId?.toString(),
      },
      {
        name: department.name,
        code: department.code,
        parentId: department.parentId?.toString(),
        managerUserId: department.managerUserId?.toString(),
      },
      req
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
    console.error('Update department error:', error)
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

    // Check if department has members or is referenced
    const department = await prisma.department.findUnique({
      where: { id: BigInt(id) },
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

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    if (department._count.members > 0 || department._count.children > 0 || department._count.assignments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with members, children, or assignments' },
        { status: 400 }
      )
    }

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    // Log audit before deletion
    await logAudit(
      currentUser ? BigInt(currentUser.id) : null,
      'department_delete',
      'department',
      id,
      req,
      { name: department.name }
    )

    await prisma.department.delete({
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
    console.error('Delete department error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

