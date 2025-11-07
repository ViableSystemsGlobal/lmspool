import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  jobTitle: z.string().optional(),
  employeeCode: z.string().optional(),
  roleIds: z.array(z.number()).optional(),
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
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status') || 'all' // Default to 'all' to show all users
    const q = searchParams.get('q')

    // Build where clause
    const where: any = {}

    if (departmentId) {
      where.departmentId = BigInt(departmentId)
    }

    if (status !== 'all') {
      if (status === 'active') {
        where.status = 'active'
        where.deactivatedAt = null
      } else if (status === 'inactive') {
        where.status = 'inactive'
      } else {
        // For other status values, just filter by status
        where.status = status
      }
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
      ]
    }

    // Managers can only see their team
    if (currentUser.roles.includes('MANAGER') && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
      // Get user's managed department
      const user = await prisma.user.findUnique({
        where: { id: BigInt(currentUser.id) },
        include: {
          managedDepartment: true,
        },
      })

      if (user?.managedDepartment) {
        where.departmentId = user.managedDepartment.id
      } else {
        // Manager with no department - return empty
        return NextResponse.json({ users: [] })
      }
    }

    const users = await prisma.user.findMany({
      where,
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
      orderBy: {
        name: 'asc',
      },
      take: 100, // Pagination limit
    })

    console.log(`Found ${users.length} users in database`)

    // Convert BigInt IDs to strings for JSON serialization
    const serializedUsers = users.map(user => {
      try {
        // Serialize roles safely
        const serializedRoles = (user.roles || []).map(userRole => {
          if (!userRole || !userRole.role) {
            return null
          }
          return {
            role: {
              id: Number(userRole.role.id), // Role IDs are numbers, not BigInt
              name: userRole.role.name,
            },
          }
        }).filter(Boolean) // Remove null entries

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          jobTitle: user.jobTitle,
          employeeCode: user.employeeCode,
          departmentId: user.departmentId?.toString() || null,
          department: user.department ? {
            id: user.department.id.toString(),
            name: user.department.name,
          } : null,
          roles: serializedRoles,
        }
      } catch (error: any) {
        console.error(`Error serializing user ${user.id}:`, error)
        console.error(`User data:`, {
          id: user.id?.toString(),
          name: user.name,
          email: user.email,
          rolesCount: user.roles?.length || 0,
        })
        // Return a minimal version if serialization fails
        return {
          id: user.id.toString(),
          name: user.name || 'Unknown',
          email: user.email || 'No email',
          phone: user.phone || null,
          status: user.status || 'unknown',
          jobTitle: user.jobTitle || null,
          employeeCode: user.employeeCode || null,
          departmentId: user.departmentId?.toString() || null,
          department: null,
          roles: [],
        }
      }
    })

    console.log(`Serialized ${serializedUsers.length} users`)
    return NextResponse.json({ users: serializedUsers })
  } catch (error: any) {
    console.error('Get users error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
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
    console.log('Creating user with data:', body)
    
    const data = createSchema.parse(body)
    console.log('Parsed user data:', data)

    // Check if email already exists (check all users regardless of status)
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (existing) {
      console.log('Existing user found:', {
        id: existing.id.toString(),
        email: existing.email,
        status: existing.status,
        roles: existing.roles.length,
        deactivatedAt: existing.deactivatedAt,
      })
      return NextResponse.json(
        { error: 'User with this email already exists', userId: existing.id.toString() },
        { status: 400 }
      )
    }

    // Ensure at least one role is selected (default to LEARNER if empty)
    const roleIds = data.roleIds && data.roleIds.length > 0 ? data.roleIds : []
    
    // If no roles provided, try to find LEARNER role ID
    let finalRoleIds = roleIds
    if (roleIds.length === 0) {
      const learnerRole = await prisma.role.findFirst({
        where: { name: 'LEARNER' },
      })
      if (learnerRole) {
        finalRoleIds = [Number(learnerRole.id)]
      }
    }

    console.log('Final role IDs to create:', finalRoleIds)

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        departmentId: data.departmentId ? BigInt(data.departmentId) : undefined,
        jobTitle: data.jobTitle,
        employeeCode: data.employeeCode,
        status: 'active',
        roles: finalRoleIds.length > 0
          ? {
              create: finalRoleIds.map((roleId) => ({
                roleId: Number(roleId),
              })),
            }
          : undefined,
      },
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

    // Log audit
    await logAudit(
      currentUser ? BigInt(currentUser.id) : null,
      'user_create',
      'user',
      user.id.toString(),
      req,
      { name: user.name, email: user.email, roleIds: finalRoleIds }
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
      console.error('Validation error:', error.issues)
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
    console.error('Create user error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

