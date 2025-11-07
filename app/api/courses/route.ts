import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  passMark: z.number().min(0).max(100).optional(),
  difficulty: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.string().min(1).optional() // Accept any non-empty string (URL or path)
  ),
})

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const q = searchParams.get('q')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    // Learners can only see published courses
    if (currentUser.roles.includes('LEARNER') && !currentUser.roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
      where.status = 'published'
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 100,
    })

    // Convert BigInt IDs to strings for JSON serialization
    const coursesResponse = courses.map(course => ({
      ...course,
      id: course.id.toString(),
    }))

    return NextResponse.json({ courses: coursesResponse })
  } catch (error) {
    console.error('Get courses error:', error)
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

    // Prepare course data
    const courseData: any = {
      title: data.title,
      passMark: data.passMark ?? 70,
      tags: data.tags ?? [],
      status: 'draft',
    }
    
    if (data.description) courseData.description = data.description
    if (data.category) courseData.category = data.category
    if (data.difficulty) courseData.difficulty = data.difficulty
    if (data.imageUrl && data.imageUrl !== '') courseData.imageUrl = data.imageUrl

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    // Create course
    const course = await prisma.course.create({
      data: courseData,
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    })

    // Log audit
    await logAudit(
      currentUser ? BigInt(currentUser.id) : null,
      'course_create',
      'course',
      course.id.toString(),
      req,
      { title: course.title, status: course.status }
    )

    // Convert response
    const courseResponse = {
      id: course.id.toString(),
      title: course.title,
      description: course.description,
      category: course.category,
      passMark: course.passMark,
      status: course.status,
      difficulty: course.difficulty,
      estimatedDurationMin: course.estimatedDurationMin,
      tags: course.tags,
      imageUrl: course.imageUrl,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      _count: course._count,
    }

    return NextResponse.json({ course: courseResponse })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 })
    }
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({
        error: error.message
      }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    
    console.error('Course creation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

