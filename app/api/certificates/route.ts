import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const courseId = searchParams.get('courseId')
    const status = searchParams.get('status') // active|expired|revoked

    // Regular users can only see their own certificates
    if (!currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN') && !currentUser.roles.includes('MANAGER')) {
      if (userId && userId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    const where: any = {}

    if (userId) {
      where.userId = BigInt(userId)
    } else if (!currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN') && !currentUser.roles.includes('MANAGER')) {
      // Regular users can only see their own
      where.userId = BigInt(currentUser.id)
    }

    if (courseId) {
      where.courseId = BigInt(courseId)
    }

    if (status === 'expired') {
      where.expiryAt = { lt: new Date() }
      where.revokedAt = null
    } else if (status === 'revoked') {
      where.revokedAt = { not: null }
    } else if (status === 'active') {
      where.OR = [
        { expiryAt: null },
        { expiryAt: { gte: new Date() } },
      ]
      where.revokedAt = null
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedCertificates = certificates.map(cert => ({
      ...cert,
      id: cert.id.toString(),
      userId: cert.userId.toString(),
      courseId: cert.courseId.toString(),
      templateId: cert.templateId?.toString() || null,
      user: {
        ...cert.user,
        id: cert.user.id.toString(),
      },
      course: {
        ...cert.course,
        id: cert.course.id.toString(),
      },
      isExpired: cert.expiryAt ? new Date(cert.expiryAt) < new Date() : false,
      isRevoked: cert.revokedAt !== null,
    }))

    return NextResponse.json({ certificates: serializedCertificates })
  } catch (error: any) {
    console.error('Get certificates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

