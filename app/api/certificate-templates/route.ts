import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultExpiryDays: z.number().optional().nullable(),
  designJson: z.record(z.string(), z.any()).optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const templates = await prisma.certificateTemplate.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedTemplates = templates.map(t => ({
      ...t,
      id: t.id.toString(),
      backgroundFileId: t.backgroundFileId?.toString() || null,
    }))

    return NextResponse.json({ templates: serializedTemplates })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get certificate templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const data = createSchema.parse(body)

    const template = await prisma.certificateTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        defaultExpiryDays: data.defaultExpiryDays,
        designJson: data.designJson || {},
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      template: {
        ...template,
        id: template.id.toString(),
        backgroundFileId: template.backgroundFileId?.toString() || null,
      },
    }, { status: 201 })
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
    console.error('Create certificate template error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

