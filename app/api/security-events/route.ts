import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const searchParams = req.nextUrl.searchParams
    const severity = searchParams.get('severity')
    const resolved = searchParams.get('resolved') // 'true' | 'false' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (severity) {
      where.severity = severity
    }

    if (resolved === 'true') {
      where.resolvedAt = { not: null }
    } else if (resolved === 'false') {
      where.resolvedAt = null
    }

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: {
          detectedAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.securityEvent.count({ where }),
    ])

    return NextResponse.json({
      events: events.map(event => ({
        id: event.id.toString(),
        eventType: event.eventType,
        description: event.description,
        detectedAt: event.detectedAt.toISOString(),
        severity: event.severity,
        resolvedAt: event.resolvedAt?.toISOString() || null,
        resolutionNotes: event.resolutionNotes,
      })),
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
    console.error('Get security events error:', error)
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
    const { eventType, description, severity } = body

    if (!eventType || !description || !severity) {
      return NextResponse.json(
        { error: 'eventType, description, and severity are required' },
        { status: 400 }
      )
    }

    const event = await prisma.securityEvent.create({
      data: {
        eventType,
        description,
        severity,
      },
    })

    return NextResponse.json({
      id: event.id.toString(),
      eventType: event.eventType,
      description: event.description,
      detectedAt: event.detectedAt.toISOString(),
      severity: event.severity,
      resolvedAt: event.resolvedAt?.toISOString() || null,
      resolutionNotes: event.resolutionNotes,
    })
  } catch (error: any) {
    console.error('Create security event error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

