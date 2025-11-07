import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const { id } = await params

    const log = await prisma.auditLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!log) {
      return NextResponse.json(
        { error: 'Audit log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: log.id.toString(),
      actorUserId: log.actorUserId?.toString() || null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ip: log.ip,
      userAgent: log.userAgent,
      ts: log.ts.toISOString(),
      meta: log.meta,
      changedFields: log.changedFields,
      actorUser: log.actorUser ? {
        id: log.actorUser.id.toString(),
        name: log.actorUser.name,
        email: log.actorUser.email,
      } : null,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get audit log error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

