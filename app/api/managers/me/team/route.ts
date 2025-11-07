import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const manager = await requireRoles('MANAGER', 'ADMIN', 'SUPER_ADMIN')

    // Get manager's department
    const user = await prisma.user.findUnique({
      where: { id: BigInt(manager.id) },
      include: {
        managedDepartment: true,
      },
    })

    if (!user?.managedDepartment) {
      return NextResponse.json({ team: [] })
    }

    // Get all members of the department
    const teamMembers = await prisma.user.findMany({
      where: {
        departmentId: user.managedDepartment.id,
        status: 'active',
        deactivatedAt: null,
      },
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
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate metrics for each team member
    const team = await Promise.all(
      teamMembers.map(async (member) => {
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

        // Convert BigInt IDs to strings for JSON serialization
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

    return NextResponse.json({ team })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

