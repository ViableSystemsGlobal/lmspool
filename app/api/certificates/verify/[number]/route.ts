import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params

    const certificate = await prisma.certificate.findUnique({
      where: { number },
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
            description: true,
          },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Certificate not found',
        },
        { status: 404 }
      )
    }

    const isExpired = certificate.expiryAt ? new Date(certificate.expiryAt) < new Date() : false
    const isRevoked = certificate.revokedAt !== null

    // Convert BigInt IDs to strings for JSON serialization
    const serializedCertificate = {
      ...certificate,
      id: certificate.id.toString(),
      userId: certificate.userId.toString(),
      courseId: certificate.courseId.toString(),
      templateId: certificate.templateId?.toString() || null,
      user: {
        ...certificate.user,
        id: certificate.user.id.toString(),
      },
      course: {
        ...certificate.course,
        id: certificate.course.id.toString(),
      },
    }

    return NextResponse.json({
      valid: !isExpired && !isRevoked,
      certificate: serializedCertificate,
      status: isRevoked ? 'revoked' : isExpired ? 'expired' : 'active',
      isExpired,
      isRevoked,
    })
  } catch (error: any) {
    console.error('Verify certificate error:', error)
    return NextResponse.json(
      { 
        valid: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

