import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')
    const status = searchParams.get('status') // read|unread|all
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where: any = {
      userId: BigInt(user.id),
    }

    if (type) {
      where.type = type
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        sentAt: 'desc',
      },
      take: limit * 2, // Fetch more to account for filtering
    })

    // Filter by read status using metaJson
    let filteredNotifications = notifications
    if (unreadOnly || status === 'unread') {
      filteredNotifications = notifications.filter(n => {
        const meta = n.metaJson as any
        return !meta || !meta.readAt
      })
    } else if (status === 'read') {
      filteredNotifications = notifications.filter(n => {
        const meta = n.metaJson as any
        return meta && meta.readAt
      })
    }

    // Limit results
    filteredNotifications = filteredNotifications.slice(0, limit)

    // Convert BigInt IDs to strings for JSON serialization
    const serializedNotifications = filteredNotifications.map(n => ({
      ...n,
      id: n.id.toString(),
      userId: n.userId.toString(),
      read: (n.metaJson as any)?.readAt ? true : false,
    }))

    // Get unread count (using metaJson)
    const allNotifications = await prisma.notification.findMany({
      where: {
        userId: BigInt(user.id),
      },
      select: {
        metaJson: true,
      },
    })
    const unreadCount = allNotifications.filter(n => {
      const meta = n.metaJson as any
      return !meta || !meta.readAt
    }).length

    return NextResponse.json({
      notifications: serializedNotifications,
      unreadCount,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

