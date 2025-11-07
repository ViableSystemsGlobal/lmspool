import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, requireAuth, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit, logAuditChange } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  jobTitle: z.string().optional(),
  employeeCode: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  roleIds: z.array(z.number()).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth()
    const { id } = await params
    const userId = BigInt(id)

    // Users can update their own profile (limited fields)
    // Admins can update everything
    const isSelf = currentUser.id === id
    const isAdmin = currentUser.roles.includes('ADMIN') || currentUser.roles.includes('SUPER_ADMIN')

    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const data = updateSchema.parse(body)

    // Get existing user for audit logging
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Role changes require SUPER_ADMIN
    if (data.roleIds && !currentUser.roles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Only SUPER_ADMIN can change roles' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (data.name !== undefined && (isAdmin || isSelf)) updateData.name = data.name
    if (data.phone !== undefined && (isAdmin || isSelf)) updateData.phone = data.phone
    if (data.jobTitle !== undefined && isAdmin) updateData.jobTitle = data.jobTitle
    if (data.employeeCode !== undefined && isAdmin) updateData.employeeCode = data.employeeCode
    if (data.departmentId !== undefined && isAdmin) {
      updateData.departmentId = data.departmentId ? BigInt(data.departmentId) : null
    }
    if (data.status !== undefined && isAdmin) {
      updateData.status = data.status
      if (data.status === 'inactive') {
        updateData.deactivatedAt = new Date()
      } else {
        updateData.deactivatedAt = null
      }
    }

    // Handle role updates
    if (data.roleIds && isAdmin) {
      // Remove existing roles
      await prisma.userRole.deleteMany({
        where: { userId },
      })

      // Add new roles
      if (data.roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: data.roleIds.map((roleId) => ({
            userId,
            roleId,
          })),
        })
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    // Log audit with changes
    await logAuditChange(
      BigInt(currentUser.id),
      'user_update',
      'user',
      id,
      {
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        departmentId: existingUser.departmentId?.toString(),
        jobTitle: existingUser.jobTitle,
        employeeCode: existingUser.employeeCode,
        status: existingUser.status,
        roleIds: existingUser.roles.map(r => Number(r.role.id)),
      },
      {
        name: user.name,
        email: user.email,
        phone: user.phone,
        departmentId: user.departmentId?.toString(),
        jobTitle: user.jobTitle,
        employeeCode: user.employeeCode,
        status: user.status,
        roleIds: user.roles.map(r => Number(r.role.id)),
      },
      req
    )

    // Convert BigInt IDs to strings for JSON serialization
    const serializedUser = {
      ...user,
      id: user.id.toString(),
      departmentId: user.departmentId?.toString() || null,
      department: user.department ? {
        ...user.department,
        id: user.department.id.toString(),
      } : null,
      roles: user.roles.map(userRole => ({
        ...userRole,
        role: {
          ...userRole.role,
          id: Number(userRole.role.id), // Role IDs are numbers, not BigInt
        },
      })),
    }

    return NextResponse.json({ user: serializedUser })
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
    console.error('Update user error:', error)
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

    // Get current user and existing user for audit logging
    const currentUser = await getCurrentUser()
    const existingUser = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: {
        name: true,
        email: true,
      },
    })

    // Delete user roles first
    await prisma.userRole.deleteMany({
      where: { userId: BigInt(id) },
    })

    // Log audit before deletion
    if (existingUser) {
      await logAudit(
        currentUser ? BigInt(currentUser.id) : null,
        'user_delete',
        'user',
        id,
        req,
        { name: existingUser.name, email: existingUser.email }
      )
    }

    // Delete user
    await prisma.user.delete({
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
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

