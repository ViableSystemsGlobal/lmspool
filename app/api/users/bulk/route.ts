import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const bulkActionSchema = z.object({
  userIds: z.array(z.string()),
  action: z.enum(['activate', 'deactivate', 'delete']),
})

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await bulkActionSchema.parse(await req.json())
    const { userIds, action } = body

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const userIdsBigInt = userIds.map(id => BigInt(id))

    if (action === 'activate') {
      // Get user info for audit logging
      const users = await prisma.user.findMany({
        where: { id: { in: userIdsBigInt } },
        select: { id: true, name: true, email: true },
      })

      await prisma.user.updateMany({
        where: {
          id: {
            in: userIdsBigInt,
          },
        },
        data: {
          status: 'active',
          deactivatedAt: null,
        },
      })

      // Log audit for each user
      for (const user of users) {
        await logAudit(
          currentUser ? BigInt(currentUser.id) : null,
          'user_bulk_activate',
          'user',
          user.id.toString(),
          req,
          { name: user.name, email: user.email, bulkAction: true }
        )
      }

      return NextResponse.json({
        success: true,
        activated: userIds.length,
      })
    }

    if (action === 'deactivate') {
      // Get user info for audit logging
      const users = await prisma.user.findMany({
        where: { id: { in: userIdsBigInt } },
        select: { id: true, name: true, email: true },
      })

      await prisma.user.updateMany({
        where: {
          id: {
            in: userIdsBigInt,
          },
        },
        data: {
          status: 'inactive',
          deactivatedAt: new Date(),
        },
      })

      // Log audit for each user
      for (const user of users) {
        await logAudit(
          currentUser ? BigInt(currentUser.id) : null,
          'user_bulk_deactivate',
          'user',
          user.id.toString(),
          req,
          { name: user.name, email: user.email, bulkAction: true }
        )
      }

      return NextResponse.json({
        success: true,
        deactivated: userIds.length,
      })
    }

    if (action === 'delete') {
      // Get user info for audit logging before deletion
      const users = await prisma.user.findMany({
        where: { id: { in: userIdsBigInt } },
        select: { id: true, name: true, email: true },
      })

      // Log audit for each user before deletion
      for (const user of users) {
        await logAudit(
          currentUser ? BigInt(currentUser.id) : null,
          'user_delete',
          'user',
          user.id.toString(),
          req,
          { name: user.name, email: user.email, bulkAction: true }
        )
      }

      // Delete user roles first
      await prisma.userRole.deleteMany({
        where: {
          userId: {
            in: userIdsBigInt,
          },
        },
      })

      // Delete users
      await prisma.user.deleteMany({
        where: {
          id: {
            in: userIdsBigInt,
          },
        },
      })

      return NextResponse.json({
        success: true,
        deleted: userIds.length,
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

