import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const CERTIFICATES_PATH = process.env.CERTIFICATES_PATH || './certificates'

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

    // Regular users can only download their own certificates
    if (!currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN') && !currentUser.roles.includes('MANAGER')) {
      if (certificate.userId.toString() !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Extract filename from pdfUrl
    const filename = certificate.pdfUrl.split('/').pop() || `${certificate.number}.pdf`
    const filepath = join(CERTIFICATES_PATH, filename)

    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'Certificate file not found' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(filepath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${certificate.number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Download certificate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

