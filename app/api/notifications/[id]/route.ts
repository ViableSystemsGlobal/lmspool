import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await req.json()
    const { read } = body

    const notification = await prisma.notification.findUnique({
      where: { id: BigInt(id) },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Users can only update their own notifications
    if (notification.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Mark as read/unread using metaJson
    const currentMeta = (notification.metaJson as any) || {}
    const updatedMeta = {
      ...currentMeta,
      readAt: read ? new Date().toISOString() : null,
    }

    const updated = await prisma.notification.update({
      where: { id: BigInt(id) },
      data: {
        metaJson: updatedMeta,
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      notification: {
        ...updated,
        id: updated.id.toString(),
        userId: updated.userId.toString(),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Update notification error:', error)
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
    const user = await requireAuth()
    const { id } = await params

    const notification = await prisma.notification.findUnique({
      where: { id: BigInt(id) },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Users can only delete their own notifications
    if (notification.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.notification.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ message: 'Notification deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

