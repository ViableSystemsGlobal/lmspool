import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
    const { id } = await params

    const department = await prisma.department.findUnique({
      where: { id: BigInt(id) },
      include: {
        members: {
          include: {
            enrollments: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    const teamMembers = await Promise.all(
      department.members.map(async (member) => {
        const enrollments = member.enrollments
        const total = enrollments.length
        const completed = enrollments.filter(e => e.status === 'completed').length
        const inProgress = enrollments.filter(e => e.status === 'started').length
        const overdue = enrollments.filter(e => {
          if (!e.dueAt) return false
          return new Date(e.dueAt) < new Date() && e.status !== 'completed'
        }).length

        // Get progress stats for this user
        const progressStats = await prisma.progress.aggregate({
          where: {
            userId: member.id,
          },
          _sum: {
            timeSpentSec: true,
          },
          _count: {
            id: true,
          },
        })

        // Get quiz attempt stats
        const quizStats = await prisma.quizAttempt.aggregate({
          where: {
            userId: member.id,
            submittedAt: { not: null },
          },
          _avg: {
            score: true,
          },
          _count: {
            id: true,
          },
        })

        return {
          userId: member.id.toString(),
          name: member.name,
          email: member.email,
          totalAssignments: total,
          completed,
          inProgress,
          overdue,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          totalTimeSpent: Math.round((progressStats._sum.timeSpentSec || 0) / 60), // minutes
          totalLessonsCompleted: progressStats._count.id,
          averageQuizScore: quizStats._avg.score ? Math.round(quizStats._avg.score) : null,
          totalQuizAttempts: quizStats._count.id,
        }
      })
    )

    // Convert BigInt IDs to strings for JSON serialization
    return NextResponse.json({
      department: {
        id: department.id.toString(),
        name: department.name,
      },
      team: teamMembers,
      summary: {
        totalMembers: teamMembers.length,
        totalAssignments: teamMembers.reduce((sum, m) => sum + m.totalAssignments, 0),
        totalCompleted: teamMembers.reduce((sum, m) => sum + m.completed, 0),
        totalOverdue: teamMembers.reduce((sum, m) => sum + m.overdue, 0),
        totalTimeSpent: teamMembers.reduce((sum, m) => sum + m.totalTimeSpent, 0),
        avgCompletionRate: teamMembers.length > 0
          ? Math.round(teamMembers.reduce((sum, m) => sum + m.completionRate, 0) / teamMembers.length)
          : 0,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Team analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

