import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'

const SESSION_COOKIE_NAME = 'session'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (sessionCookie?.value) {
      // Extract session ID from JWT
      const payload = await verifySession(sessionCookie.value)
      
      if (payload?.sessionId) {
        // Revoke session in database
        try {
          await prisma.session.update({
            where: { id: payload.sessionId },
            data: {
              revokedAt: new Date(),
            },
          })
        } catch (error) {
          // Session might not exist, continue anyway
          console.warn('Session not found during logout:', payload.sessionId)
        }
      }
    }

    // Clear the session cookie
    const response = NextResponse.redirect(new URL('/signin', req.url))
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    
    // Even if there's an error, clear the cookie and redirect
    const response = NextResponse.redirect(new URL('/signin', req.url))
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    
    return response
  }
}
