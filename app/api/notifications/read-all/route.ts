import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    // Mark all user's unread notifications as read using metaJson
    const notifications = await prisma.notification.findMany({
      where: {
        userId: BigInt(user.id),
      },
    })

    const now = new Date().toISOString()
    await Promise.all(
      notifications.map(async (notification) => {
        const meta = (notification.metaJson as any) || {}
        if (!meta.readAt) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              metaJson: {
                ...meta,
                readAt: now,
              },
            },
          })
        }
      })
    )

    return NextResponse.json({ message: 'All notifications marked as read' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Mark all read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

