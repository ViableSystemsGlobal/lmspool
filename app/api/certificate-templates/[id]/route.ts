import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  defaultExpiryDays: z.number().optional().nullable(),
  designJson: z.record(z.string(), z.any()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const template = await prisma.certificateTemplate.findUnique({
      where: { id: BigInt(id) },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      template: {
        ...template,
        id: template.id.toString(),
        backgroundFileId: template.backgroundFileId?.toString() || null,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get certificate template error:', error)
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
    const data = updateSchema.parse(body)

    const template = await prisma.certificateTemplate.findUnique({
      where: { id: BigInt(id) },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.certificateTemplate.update({
      where: { id: BigInt(id) },
      data: {
        name: data.name,
        description: data.description,
        defaultExpiryDays: data.defaultExpiryDays,
        designJson: data.designJson,
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      template: {
        ...updated,
        id: updated.id.toString(),
        backgroundFileId: updated.backgroundFileId?.toString() || null,
      },
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
    console.error('Update certificate template error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const template = await prisma.certificateTemplate.findUnique({
      where: { id: BigInt(id) },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    await prisma.certificateTemplate.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ message: 'Template deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Delete certificate template error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

