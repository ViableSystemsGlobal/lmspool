import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  type: z.enum(['single_choice', 'multi_choice', 'true_false', 'short_answer']),
  promptHtml: z.string().min(1),
  points: z.number().min(1).default(1),
  order: z.number().optional(),
  explanationHtml: z.string().optional(),
  options: z.array(z.object({
    label: z.string().min(1),
    isCorrect: z.boolean().default(false),
    order: z.number().optional(),
  })).optional(), // Options are optional for short_answer type
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await requireRoles('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'LEARNER')
    
    const questions = await prisma.question.findMany({
      where: { quizId: BigInt(id) },
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
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedQuestions = questions.map(question => ({
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
    }))

    return NextResponse.json({ questions: serializedQuestions })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get questions error:', error)
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
    const maxOrder = await prisma.question.findFirst({
      where: { quizId: BigInt(id) },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const question = await prisma.question.create({
      data: {
        quizId: BigInt(id),
        type: data.type,
        promptHtml: data.promptHtml,
        points: data.points,
        order: data.order ?? (maxOrder?.order ?? -1) + 1,
        explanationHtml: data.explanationHtml,
        options: data.options && data.options.length > 0 ? {
          create: data.options.map((opt, idx) => ({
            label: opt.label,
            isCorrect: opt.isCorrect,
            order: opt.order ?? idx,
          })),
        } : undefined,
      },
      include: {
        options: true,
      },
    })

    // Convert BigInt IDs to strings for JSON serialization
    const serializedQuestion = {
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
    }

    return NextResponse.json({ question: serializedQuestion })
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
    console.error('Create question error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

