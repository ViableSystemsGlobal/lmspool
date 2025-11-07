import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  type: z.enum(['text', 'video', 'pdf']),
  title: z.string().min(1),
  contentUrl: z.string().optional(),
  contentHtml: z.string().optional(),
  durationMin: z.number().optional(),
  order: z.number().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lessons = await prisma.lesson.findMany({
      where: { moduleId: BigInt(id) },
      orderBy: {
        order: 'asc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedLessons = lessons.map(lesson => ({
      ...lesson,
      id: lesson.id.toString(),
      moduleId: lesson.moduleId.toString(),
    }))

    return NextResponse.json({ lessons: serializedLessons })
  } catch (error) {
    console.error('Get lessons error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const body = await req.json()
    const data = createSchema.parse(body)

    // Get max order
    const maxOrder = await prisma.lesson.findFirst({
      where: { moduleId: BigInt(id) },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: BigInt(id),
        type: data.type,
        title: data.title,
        contentUrl: data.contentUrl,
        contentHtml: data.contentHtml,
        durationMin: data.durationMin,
        order: data.order ?? (maxOrder?.order ?? -1) + 1,
      },
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
    console.error('Create lesson error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

