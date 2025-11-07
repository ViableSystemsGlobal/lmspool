import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (userId) {
      where.actorUserId = BigInt(userId)
    }

    if (action) {
      where.action = action
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (dateFrom || dateTo) {
      where.ts = {}
      if (dateFrom) {
        where.ts.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.ts.lte = new Date(dateTo)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          ts: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    // Serialize BigInt IDs
    const serializedLogs = logs.map(log => ({
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
    }))

    return NextResponse.json({
      logs: serializedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

