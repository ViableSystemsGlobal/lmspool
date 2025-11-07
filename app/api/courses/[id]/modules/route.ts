import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  order: z.number().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const modules = await prisma.module.findMany({
      where: { courseId: BigInt(id) },
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
      orderBy: {
        order: 'asc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedModules = modules.map(module => ({
      ...module,
      id: module.id.toString(),
      courseId: module.courseId.toString(),
      lessons: module.lessons.map(lesson => ({
        ...lesson,
        id: lesson.id.toString(),
        moduleId: lesson.moduleId.toString(),
      })),
    }))

    return NextResponse.json({ modules: serializedModules })
  } catch (error) {
    console.error('Get modules error:', error)
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
    const maxOrder = await prisma.module.findFirst({
      where: { courseId: BigInt(id) },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const module = await prisma.module.create({
      data: {
        courseId: BigInt(id),
        title: data.title,
        order: data.order ?? (maxOrder?.order ?? -1) + 1,
      },
      include: {
        lessons: true,
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
    console.error('Create module error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

