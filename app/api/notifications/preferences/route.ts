import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp', 'push', 'in_app']),
  optIn: z.boolean(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    const preferences = await prisma.userNotificationPreference.findMany({
      where: {
        userId: BigInt(user.id),
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedPreferences = preferences.map(p => ({
      ...p,
      id: p.id.toString(),
      userId: p.userId.toString(),
    }))

    return NextResponse.json({ preferences: serializedPreferences })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get notification preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await req.json()
    const data = updatePreferencesSchema.parse(body)

    // Upsert preference
    const preference = await prisma.userNotificationPreference.upsert({
      where: {
        userId_channel: {
          userId: BigInt(user.id),
          channel: data.channel,
        },
      },
      update: {
        optIn: data.optIn,
      },
      create: {
        userId: BigInt(user.id),
        channel: data.channel,
        optIn: data.optIn,
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      preference: {
        ...preference,
        id: preference.id.toString(),
        userId: preference.userId.toString(),
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Update notification preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

