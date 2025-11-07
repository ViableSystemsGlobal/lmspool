import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  timeLimitSec: z.number().optional().nullable(),
  attemptsAllowed: z.number().optional(),
  randomize: z.boolean().optional(),
  passMarkOverride: z.number().optional().nullable(),
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
    if (data.timeLimitSec !== undefined) updateData.timeLimitSec = data.timeLimitSec
    if (data.attemptsAllowed !== undefined) updateData.attemptsAllowed = data.attemptsAllowed
    if (data.randomize !== undefined) updateData.randomize = data.randomize
    if (data.passMarkOverride !== undefined) updateData.passMarkOverride = data.passMarkOverride

    const quiz = await prisma.quiz.update({
      where: { id: BigInt(id) },
      data: updateData,
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
    console.error('Update quiz error:', error)
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

    // Quiz will cascade delete questions and attempts
    await prisma.quiz.delete({
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
    console.error('Delete quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

