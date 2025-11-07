import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyOTP, decrementOTPAttempts } from '@/lib/otp'
import { createSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code } = verifySchema.parse(body)

    const result = await verifyOTP(email.toLowerCase(), code)

    if (!result.valid || !result.userId) {
      await decrementOTPAttempts(email.toLowerCase(), code)
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 401 }
      )
    }

    // Get user roles
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 401 }
      )
    }

    const roles = user.roles.map(ur => ur.role.name)

    // Create session
    const sessionId = randomUUID()
    const expiresAt = new Date()
    expiresAt.setTime(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        userAgent: req.headers.get('user-agent') || undefined,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        expiresAt,
      },
    })

    const token = createSessionToken(user.id, sessionId, roles)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        roles,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }
    console.error('OTP verify error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

