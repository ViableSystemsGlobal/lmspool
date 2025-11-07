import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const CERTIFICATES_PATH = process.env.CERTIFICATES_PATH || './certificates'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // This is a public endpoint for viewing certificates via direct link
    // We'll verify the certificate exists but won't require auth for viewing

    const { prisma } = await import('@/lib/prisma')
    const certificate = await prisma.certificate.findUnique({
      where: { id: BigInt(id) },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
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
        'Content-Disposition': `inline; filename="${certificate.number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Get certificate PDF error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

