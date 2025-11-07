import { NextRequest, NextResponse } from 'next/server'
import { createOTP } from '@/lib/otp'
import { z } from 'zod'

const requestSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = requestSchema.parse(body)

    // Always return 200 to avoid user enumeration
    await createOTP(email.toLowerCase())

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      )
    }
    console.error('OTP request error:', error)
    return NextResponse.json({ ok: true }) // Still return 200 to avoid enumeration
  }
}

