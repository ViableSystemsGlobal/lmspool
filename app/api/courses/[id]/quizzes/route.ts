import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  timeLimitSec: z.number().optional(),
  attemptsAllowed: z.number().default(1),
  randomize: z.boolean().default(false),
  passMarkOverride: z.number().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const quizzes = await prisma.quiz.findMany({
      where: { courseId: BigInt(id) },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            attempts: true,
            questions: true,
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
      questions: quiz.questions.map(question => ({
        ...question,
        id: question.id.toString(),
        quizId: question.quizId.toString(),
        categoryId: question.categoryId?.toString() || null,
        mediaFileId: question.mediaFileId?.toString() || null,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const body = await req.json()
    const data = createSchema.parse(body)

    // Check if quiz already exists for this course
    const existing = await prisma.quiz.findFirst({
      where: { courseId: BigInt(id) },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A quiz already exists for this course. Please edit the existing quiz.' },
        { status: 400 }
      )
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId: BigInt(id),
        timeLimitSec: data.timeLimitSec,
        attemptsAllowed: data.attemptsAllowed,
        randomize: data.randomize,
        passMarkOverride: data.passMarkOverride,
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
        _count: {
          select: {
            attempts: true,
            questions: true,
          },
        },
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedQuiz = {
      ...quiz,
      id: quiz.id.toString(),
      courseId: quiz.courseId.toString(),
      questions: quiz.questions.map(question => ({
        ...question,
        id: question.id.toString(),
        quizId: question.quizId.toString(),
        categoryId: question.categoryId?.toString() || null,
        mediaFileId: question.mediaFileId?.toString() || null,
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

