import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const QR_CODE_PATH = process.env.QR_CODE_PATH || './certificates/qrcodes'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Security: Only allow PNG files
    if (!filename.endsWith('.png')) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      )
    }

    const filepath = join(QR_CODE_PATH, filename)

    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(filepath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Get QR code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

