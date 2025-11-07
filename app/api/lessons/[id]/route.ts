import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  type: z.enum(['text', 'video', 'pdf']).optional(),
  title: z.string().min(1).optional(),
  contentUrl: z.string().optional(),
  contentHtml: z.string().optional(),
  durationMin: z.number().optional(),
  order: z.number().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const body = await req.json()
    const data = updateSchema.parse(body)

    const updateData: any = {}
    if (data.type !== undefined) updateData.type = data.type
    if (data.title !== undefined) updateData.title = data.title
    if (data.contentUrl !== undefined) updateData.contentUrl = data.contentUrl
    if (data.contentHtml !== undefined) updateData.contentHtml = data.contentHtml
    if (data.durationMin !== undefined) updateData.durationMin = data.durationMin
    if (data.order !== undefined) updateData.order = data.order

    const lesson = await prisma.lesson.update({
      where: { id: BigInt(id) },
      data: updateData,
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedLesson = {
      ...lesson,
      id: lesson.id.toString(),
      moduleId: lesson.moduleId.toString(),
    }

    return NextResponse.json({ lesson: serializedLesson })
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
    console.error('Update lesson error:', error)
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

    await prisma.lesson.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Delete lesson error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

