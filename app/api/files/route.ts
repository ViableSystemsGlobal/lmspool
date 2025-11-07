import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const STORAGE_PATH = process.env.STORAGE_PATH || './uploads'
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function GET(req: NextRequest) {
  try {
    await requireAuth()

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const q = searchParams.get('q')

    const where: any = {}

    if (type) {
      where.mime = { contains: type, mode: 'insensitive' }
    }

    if (category) {
      where.categoryId = BigInt(category)
    }

    if (q) {
      where.OR = [
        { url: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const files = await prisma.file.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    // Convert BigInt to string for JSON serialization
    const filesResponse = files.map(file => ({
      ...file,
      id: file.id.toString(),
      size: file.size.toString(),
      uploadedById: file.uploadedById.toString(),
      uploadedBy: file.uploadedBy ? {
        ...file.uploadedBy,
        id: file.uploadedBy.id.toString(),
      } : null,
      categoryId: file.categoryId ? file.categoryId.toString() : null,
      parentFileId: file.parentFileId ? file.parentFileId.toString() : null,
      category: file.category ? {
        ...file.category,
        id: file.category.id.toString(),
      } : null,
    }))

    return NextResponse.json({ files: filesResponse })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    if (!existsSync(STORAGE_PATH)) {
      await mkdir(STORAGE_PATH, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filepath = join(STORAGE_PATH, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Save to database - use API route for serving files
    const dbFile = await prisma.file.create({
      data: {
        url: `/api/uploads/${filename}`,
        mime: file.type,
        size: BigInt(file.size),
        uploadedById: BigInt(user.id),
        description: formData.get('description') as string || undefined,
        categoryId: formData.get('categoryId') ? BigInt(formData.get('categoryId') as string) : undefined,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Convert BigInt to string for JSON serialization
    const fileResponse = {
      ...dbFile,
      id: dbFile.id.toString(),
      size: dbFile.size.toString(),
      uploadedById: dbFile.uploadedById.toString(),
      uploadedBy: dbFile.uploadedBy ? {
        ...dbFile.uploadedBy,
        id: dbFile.uploadedBy.id.toString(),
      } : null,
      categoryId: dbFile.categoryId ? dbFile.categoryId.toString() : null,
      parentFileId: dbFile.parentFileId ? dbFile.parentFileId.toString() : null,
    }

    return NextResponse.json({ file: fileResponse })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Upload file error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    )
  }
}

