import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser, requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const revokeSchema = z.object({
  reason: z.string().min(1),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const certificate = await prisma.certificate.findUnique({
      where: { id: BigInt(id) },
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
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Regular users can only see their own certificates
    if (!currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN') && !currentUser.roles.includes('MANAGER')) {
      if (certificate.userId.toString() !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

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
      isExpired: certificate.expiryAt ? new Date(certificate.expiryAt) < new Date() : false,
      isRevoked: certificate.revokedAt !== null,
    }

    return NextResponse.json({ certificate: serializedCertificate })
  } catch (error: any) {
    console.error('Get certificate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const body = await req.json()
    const data = revokeSchema.parse(body)

    const certificate = await prisma.certificate.findUnique({
      where: { id: BigInt(id) },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    // Get user and course info for audit logging
    const certWithDetails = await prisma.certificate.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    })

    if (!certWithDetails) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Revoke certificate
    const updated = await prisma.certificate.update({
      where: { id: BigInt(id) },
      data: {
        revokedAt: new Date(),
      },
    })

    // Log audit
    await logAudit(
      currentUser ? BigInt(currentUser.id) : null,
      'certificate_revoke',
      'certificate',
      id,
      req,
      {
        certificateNumber: updated.number,
        userName: certWithDetails.user.name,
        courseTitle: certWithDetails.course.title,
        reason: data.reason,
      }
    )

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      certificate: {
        ...updated,
        id: updated.id.toString(),
        userId: updated.userId.toString(),
        courseId: updated.courseId.toString(),
        templateId: updated.templateId?.toString() || null,
        isRevoked: true,
      },
      message: 'Certificate revoked',
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Revoke certificate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

