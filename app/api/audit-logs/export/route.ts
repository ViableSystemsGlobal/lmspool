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
    const limit = parseInt(searchParams.get('limit') || '10000')

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

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actorUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        ts: 'desc',
      },
      take: limit,
    })

    // Generate CSV
    const csvHeaders = [
      'ID',
      'Timestamp',
      'User ID',
      'User Name',
      'User Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
    ].join(',')

    const csvRows = logs.map(log => [
      log.id.toString(),
      log.ts.toISOString(),
      log.actorUserId?.toString() || '',
      log.actorUser?.name || '',
      log.actorUser?.email || '',
      log.action,
      log.entityType || '',
      log.entityId || '',
      log.ip || '',
      log.userAgent || '',
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Export audit logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

