import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCertificate } from '@/lib/certificates'
import { notifyCourseCompleted, notifyCertificateIssued } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    optionIds: z.array(z.string()).optional(),
    responseText: z.string().optional(),
  })).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await req.json()
    
    console.log('Quiz submit request:', {
      quizId: id,
      userId: user.id,
      body: JSON.stringify(body),
    })
    
    // Validate request body
    const validationResult = submitSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Quiz submit validation error:', validationResult.error.issues)
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      )
    }
    
    const { attemptId, answers = [] } = validationResult.data

    if (!attemptId) {
      console.error('Missing attemptId')
      return NextResponse.json(
        { error: 'Missing attempt ID' },
        { status: 400 }
      )
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: BigInt(attemptId) },
      include: {
        quiz: {
          include: {
            course: true,
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      console.error('Attempt not found:', attemptId)
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 400 }
      )
    }

    if (attempt.userId.toString() !== user.id) {
      console.error('User mismatch:', attempt.userId.toString(), 'vs', user.id)
      return NextResponse.json(
        { error: 'Invalid attempt - user mismatch' },
        { status: 400 }
      )
    }

    if (attempt.quizId.toString() !== id) {
      console.error('Quiz mismatch:', attempt.quizId.toString(), 'vs', id)
      return NextResponse.json(
        { error: 'Invalid attempt - quiz mismatch' },
        { status: 400 }
      )
    }

    if (attempt.submittedAt) {
      return NextResponse.json(
        { error: 'Attempt already submitted' },
        { status: 400 }
      )
    }

    // Calculate score
    let totalScore = 0
    let maxScore = 0
    const questionResults: any[] = []

    for (const question of attempt.quiz.questions) {
      maxScore += question.points
      const answer = answers.find(a => a.questionId === question.id.toString())

      let isCorrect = false
      if (answer) {
        if (question.type === 'single_choice' || question.type === 'true_false') {
          const correctOption = question.options.find(opt => opt.isCorrect)
          // Convert both to strings for comparison (BigInt from DB vs string from frontend)
          const selectedOptionId = answer.optionIds?.[0]
          const correctOptionId = correctOption?.id.toString()
          isCorrect = selectedOptionId === correctOptionId && selectedOptionId !== undefined
        } else if (question.type === 'multi_choice') {
          // Convert all option IDs to strings for comparison
          const correctOptionIds = question.options
            .filter(opt => opt.isCorrect)
            .map(opt => opt.id.toString())
            .sort()
          const selectedIds = (answer.optionIds || [])
            .map(id => id.toString())
            .sort()
          // Check if arrays have same length and all IDs match
          isCorrect = correctOptionIds.length === selectedIds.length &&
            correctOptionIds.length > 0 &&
            correctOptionIds.every((id, idx) => id === selectedIds[idx])
        }
      }

      if (isCorrect) {
        totalScore += question.points
      }

      // Save answer
      await prisma.quizAttemptAnswer.create({
        data: {
          attemptId: BigInt(attemptId),
          questionId: question.id,
          optionId: answer?.optionIds?.[0] ? BigInt(answer.optionIds[0]) : undefined,
          responseText: answer?.responseText,
          isCorrect,
        },
      })

      questionResults.push({
        questionId: question.id.toString(),
        isCorrect,
        explanationHtml: question.explanationHtml,
      })
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
    const passMark = attempt.quiz.passMarkOverride ?? attempt.quiz.course.passMark
    const passed = percentage >= passMark

    // Update attempt
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: BigInt(attemptId) },
      data: {
        score: totalScore,
        submittedAt: new Date(),
        passed,
      },
    })

    // Check if course should be marked complete
    if (passed) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: BigInt(user.id),
          courseId: attempt.quiz.courseId,
          status: { in: ['assigned', 'started'] },
        },
      })

      if (enrollment) {
        // Check if all lessons are completed
        const course = await prisma.course.findUnique({
          where: { id: attempt.quiz.courseId },
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        })

        if (course) {
          const allLessons = course.modules.flatMap(m => m.lessons)
          const progressChecks = await Promise.all(
            allLessons.map(lesson =>
              prisma.progress.findUnique({
                where: {
                  userId_lessonId: {
                    userId: BigInt(user.id),
                    lessonId: lesson.id,
                  },
                },
              }).then(progress => progress?.status === 'completed')
            )
          )
          const allLessonsCompleted = allLessons.length > 0 && progressChecks.every(completed => completed === true)

          if (allLessonsCompleted) {
            // Generate certificate
            const certificate = await generateCertificate(
              BigInt(user.id),
              attempt.quiz.courseId,
              totalScore,
              maxScore
            )

            // Log audit for certificate generation
            await logAudit(
              BigInt(user.id),
              'certificate_generate',
              'certificate',
              certificate.certificateId.toString(),
              req,
              {
                certificateNumber: certificate.number,
                courseId: attempt.quiz.courseId.toString(),
                courseTitle: attempt.quiz.course.title,
                score: totalScore,
                maxScore,
                passed: totalScore >= (attempt.quiz.passMarkOverride || attempt.quiz.course.passMark),
              }
            )

            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: {
                status: 'completed',
                completedAt: new Date(),
                certificateId: certificate.certificateId,
              },
            })

            // Send completion and certificate notifications
            try {
              await notifyCourseCompleted(
                BigInt(user.id),
                course.title,
                totalScore,
                maxScore
              )
              
              await notifyCertificateIssued(
                BigInt(user.id),
                course.title,
                certificate.number
              )
            } catch (err) {
              console.error('Error sending completion notifications:', err)
            }
          }
        }
      }
    }

    return NextResponse.json({
      attempt: {
        id: updatedAttempt.id.toString(),
        score: totalScore,
        maxScore,
        percentage: Math.round(percentage),
        passed,
        submittedAt: updatedAttempt.submittedAt?.toISOString(),
      },
      results: questionResults,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Submit quiz error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error,
    })
    return NextResponse.json(
      { 
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    )
  }
}

