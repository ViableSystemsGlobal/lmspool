import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hasAccess = currentUser.roles.includes('ADMIN') || currentUser.roles.includes('SUPER_ADMIN')
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const { resolutionNotes } = body

    const event = await prisma.securityEvent.update({
      where: { id: BigInt(id) },
      data: {
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || null,
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
    console.error('Resolve security event error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

