import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const SESSION_COOKIE_NAME = 'session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface SessionPayload {
  userId: string
  sessionId: string
  roles: string[]
  iat?: number
  exp?: number
}

export function createSessionToken(userId: bigint, sessionId: string, roles: string[]): string {
  const payload: SessionPayload = {
    userId: userId.toString(),
    sessionId,
    roles,
  }

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    jwtid: sessionId,
  })

  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload
    
    // Check if session exists and is not revoked
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
    })

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  const payload = await verifySession(sessionCookie.value)
  if (!payload) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(payload.userId) },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  })

  if (!user || user.status !== 'active') {
    return null
  }

  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles.map(ur => ur.role.name),
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRoles(...allowedRoles: string[]) {
  const user = await requireAuth()
  const hasRole = user.roles.some(role => allowedRoles.includes(role))
  if (!hasRole) {
    throw new Error('Forbidden')
  }
  return user
}

