import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const quiz = await prisma.quiz.findUnique({
      where: { id: BigInt(id) },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                userId: BigInt(user.id),
                status: { in: ['assigned', 'started'] },
              },
            },
          },
        },
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Check enrollment
    if (quiz.course.enrollments.length === 0) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    // Check existing attempts
    const existingAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: BigInt(id),
        userId: BigInt(user.id),
      },
      orderBy: {
        attemptNo: 'desc',
      },
    })

    const attemptNo = existingAttempts.length > 0 ? existingAttempts[0].attemptNo + 1 : 1

    if (attemptNo > quiz.attemptsAllowed) {
      return NextResponse.json(
        { error: 'Maximum attempts reached' },
        { status: 400 }
      )
    }

    // Create attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: BigInt(id),
        userId: BigInt(user.id),
        score: 0,
        startedAt: new Date(),
        attemptNo,
        passed: false,
      },
    })

    // Randomize questions if needed
    let questions = quiz.questions
    if (quiz.randomize) {
      questions = [...questions].sort(() => Math.random() - 0.5)
    }

    // Remove correct answers for security (will be sent back after submission)
    const questionsForUser = questions.map(q => ({
      id: q.id.toString(),
      type: q.type,
      promptHtml: q.promptHtml,
      points: q.points,
      order: q.order,
      options: q.options.map(opt => ({
        id: opt.id.toString(),
        label: opt.label,
        order: opt.order,
        // Don't send isCorrect
      })),
    }))

    return NextResponse.json({
      attempt: {
        id: attempt.id.toString(),
        quizId: id,
        attemptNo,
        startedAt: attempt.startedAt.toISOString(),
        timeLimitSec: quiz.timeLimitSec,
      },
      questions: questionsForUser,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Start quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

