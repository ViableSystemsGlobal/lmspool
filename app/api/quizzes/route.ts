import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  courseId: z.string(),
  timeLimitSec: z.number().optional(),
  attemptsAllowed: z.number().min(1).default(1),
  randomize: z.boolean().default(false),
  passMarkOverride: z.number().optional(),
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
    const courseId = searchParams.get('courseId')

    const where: any = {}
    if (courseId) {
      where.courseId = BigInt(courseId)
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        questions: {
          include: {
            options: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      id: quiz.id.toString(),
      courseId: quiz.courseId.toString(),
      course: quiz.course ? {
        ...quiz.course,
        id: quiz.course.id.toString(),
      } : null,
      questions: quiz.questions.map(question => ({
        ...question,
        id: question.id.toString(),
        quizId: question.quizId.toString(),
        mediaFileId: question.mediaFileId?.toString() || null,
        categoryId: question.categoryId?.toString() || null,
        options: question.options.map(option => ({
          ...option,
          id: option.id.toString(),
          questionId: option.questionId.toString(),
        })),
      })),
    }))

    return NextResponse.json({ quizzes: serializedQuizzes })
  } catch (error: any) {
    console.error('Get quizzes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const data = createSchema.parse(body)

    const quiz = await prisma.quiz.create({
      data: {
        courseId: BigInt(data.courseId),
        timeLimitSec: data.timeLimitSec,
        attemptsAllowed: data.attemptsAllowed,
        randomize: data.randomize,
        passMarkOverride: data.passMarkOverride,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        questions: {
          include: {
            options: true,
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedQuiz = {
      ...quiz,
      id: quiz.id.toString(),
      courseId: quiz.courseId.toString(),
      course: quiz.course ? {
        ...quiz.course,
        id: quiz.course.id.toString(),
      } : null,
      questions: quiz.questions.map(question => ({
        ...question,
        id: question.id.toString(),
        quizId: question.quizId.toString(),
        mediaFileId: question.mediaFileId?.toString() || null,
        categoryId: question.categoryId?.toString() || null,
        options: question.options.map(option => ({
          ...option,
          id: option.id.toString(),
          questionId: option.questionId.toString(),
        })),
      })),
    }

    return NextResponse.json({ quiz: serializedQuiz })
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
    console.error('Create quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

