import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
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
    if (data.title !== undefined) updateData.title = data.title
    if (data.order !== undefined) updateData.order = data.order

    const module = await prisma.module.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedModule = {
      ...module,
      id: module.id.toString(),
      courseId: module.courseId.toString(),
      lessons: module.lessons.map(lesson => ({
        ...lesson,
        id: lesson.id.toString(),
        moduleId: lesson.moduleId.toString(),
      })),
    }

    return NextResponse.json({ module: serializedModule })
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
    console.error('Update module error:', error)
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

    // Module will cascade delete lessons
    await prisma.module.delete({
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
    console.error('Delete module error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

