import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  type: z.enum(['single_choice', 'multi_choice', 'true_false', 'short_answer']).optional(),
  promptHtml: z.string().min(1).optional(),
  points: z.number().min(1).optional(),
  order: z.number().optional(),
  explanationHtml: z.string().optional().nullable(),
  options: z.array(z.object({
    id: z.string().optional(), // For updating existing options
    label: z.string().min(1),
    isCorrect: z.boolean().default(false),
    order: z.number().optional(),
  })).optional(),
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

    // Get existing question
    const existingQuestion = await prisma.question.findUnique({
      where: { id: BigInt(id) },
      include: { options: true },
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (data.type !== undefined) updateData.type = data.type
    if (data.promptHtml !== undefined) updateData.promptHtml = data.promptHtml
    if (data.points !== undefined) updateData.points = data.points
    if (data.order !== undefined) updateData.order = data.order
    if (data.explanationHtml !== undefined) updateData.explanationHtml = data.explanationHtml

    // Handle options update - delete all and recreate (simpler approach)
    if (data.options !== undefined) {
      // Delete existing options
      await prisma.questionOption.deleteMany({
        where: { questionId: BigInt(id) },
      })

      // Create new options if provided
      if (data.options.length > 0) {
        updateData.options = {
          create: data.options.map((opt, idx) => ({
            label: opt.label,
            isCorrect: opt.isCorrect,
            order: opt.order ?? idx,
          })),
        }
      }
    }

    const question = await prisma.question.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
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
    console.error('Update question error:', error)
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

    // Question will cascade delete options and attempt answers
    await prisma.question.delete({
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
    console.error('Delete question error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

