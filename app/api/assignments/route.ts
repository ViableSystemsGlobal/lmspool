import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { notifyAssignmentCreated } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'

const createSchema = z.object({
  courseId: z.string(),
  scope: z.enum(['user', 'department', 'all', 'role']),
  userIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  role: z.string().optional(),
  dueAt: z.string().optional(), // ISO string
  graceDays: z.number().default(0),
  mandatory: z.boolean().default(true),
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
    const status = searchParams.get('status') // active, overdue, completed

    const where: any = {}

    if (courseId) {
      where.courseId = BigInt(courseId)
    }

    // Managers can only see assignments for their team
    if (currentUser.roles.includes('MANAGER') && !currentUser.roles.includes('ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(currentUser.id) },
        include: {
          managedDepartment: true,
        },
      })

      if (user?.managedDepartment) {
        where.targets = {
          some: {
            departmentId: user.managedDepartment.id,
          },
        }
      } else {
        return NextResponse.json({ assignments: [] })
      }
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        targets: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    // Calculate status and metrics for each assignment
    const now = new Date()
    const assignmentsWithStatus = await Promise.all(
      assignments.map(async (assignment) => {
        // Get enrollment stats
        const enrollments = await prisma.enrollment.findMany({
          where: {
            assignedViaAssignmentId: assignment.id,
          },
          select: {
            status: true,
            dueAt: true,
            completedAt: true,
          },
        })

        const total = enrollments.length
        const completed = enrollments.filter(e => e.status === 'completed').length
        const started = enrollments.filter(e => e.status === 'started').length
        const overdue = enrollments.filter(e => {
          if (!e.dueAt || e.status === 'completed') return false
          const graceDeadline = new Date(e.dueAt)
          const graceDays = assignment.graceDays || 0
          graceDeadline.setDate(graceDeadline.getDate() + graceDays)
          return now > graceDeadline
        }).length

        // Determine assignment status
        let assignmentStatus = 'active'
        if (assignment.dueAt) {
          const graceDeadline = new Date(assignment.dueAt)
          const graceDays = assignment.graceDays || 0
          graceDeadline.setDate(graceDeadline.getDate() + graceDays)
          if (now > graceDeadline && completed < total) {
            assignmentStatus = 'overdue'
          } else if (completed === total && total > 0) {
            assignmentStatus = 'completed'
          }
        }

        // Filter by status if requested
        if (status && status !== 'all' && assignmentStatus !== status) {
          return null
        }

        return {
          ...assignment,
          id: assignment.id.toString(),
          courseId: assignment.courseId.toString(),
          assignedById: assignment.assignedById.toString(),
          course: assignment.course ? {
            ...assignment.course,
            id: assignment.course.id.toString(),
          } : null,
          assignedBy: assignment.assignedBy ? {
            ...assignment.assignedBy,
            id: assignment.assignedBy.id.toString(),
          } : null,
          targets: await Promise.all(
            assignment.targets.map(async (target) => {
              let user = null
              if (target.userId) {
                const userData = await prisma.user.findUnique({
                  where: { id: target.userId },
                  select: { id: true, name: true, email: true },
                })
                if (userData) {
                  user = {
                    id: userData.id.toString(),
                    name: userData.name,
                    email: userData.email,
                  }
                }
              }
              
              return {
                ...target,
                id: target.id.toString(),
                assignmentId: target.assignmentId.toString(),
                userId: target.userId?.toString() || null,
                departmentId: target.departmentId?.toString() || null,
                user,
                department: target.department ? {
                  ...target.department,
                  id: target.department.id.toString(),
                } : null,
              }
            })
          ),
          stats: {
            total,
            completed,
            started,
            overdue,
            notStarted: total - started - completed,
          },
          status: assignmentStatus,
        }
      })
    )

    // Filter out null entries (filtered by status)
    const filteredAssignments = assignmentsWithStatus.filter(Boolean)

    return NextResponse.json({ assignments: filteredAssignments })
  } catch (error: any) {
    console.error('Get assignments error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'SUPER_ADMIN', 'MANAGER')

    const body = await req.json()
    const data = createSchema.parse(body)

    // Get course for notifications
    const course = await prisma.course.findUnique({
      where: { id: BigInt(data.courseId) },
      select: { id: true, title: true },
    })

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        courseId: BigInt(data.courseId),
        assignedById: BigInt(user.id),
        scope: data.scope,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        graceDays: data.graceDays,
        mandatory: data.mandatory,
      },
    })

    // Create assignment targets and enrollments
    const targets: any[] = []
    let enrollmentCount = 0

    if (data.scope === 'user' && data.userIds) {
      for (const userId of data.userIds) {
        targets.push({ userId: BigInt(userId) })
        
        // Auto-enroll - check if exists first
        const existing = await prisma.enrollment.findFirst({
          where: {
            userId: BigInt(userId),
            courseId: BigInt(data.courseId),
          },
        })

        if (existing) {
          await prisma.enrollment.update({
            where: { id: existing.id },
            data: {
              assignedViaAssignmentId: assignment.id,
              dueAt: data.dueAt ? new Date(data.dueAt) : null,
              mandatory: data.mandatory,
            },
          })
          enrollmentCount++
        } else {
          await prisma.enrollment.create({
            data: {
              userId: BigInt(userId),
              courseId: BigInt(data.courseId),
              assignedViaAssignmentId: assignment.id,
              status: 'assigned',
              dueAt: data.dueAt ? new Date(data.dueAt) : null,
              mandatory: data.mandatory,
            },
          })
          enrollmentCount++
          
          // Send notification
          if (course) {
            try {
              await notifyAssignmentCreated(
                BigInt(userId),
                course.title,
                data.dueAt ? new Date(data.dueAt) : null
              )
            } catch (err) {
              console.error('Error sending assignment notification:', err)
            }
          }
        }
      }
      console.log(`Assignment created: ${enrollmentCount} enrollments created for ${data.userIds.length} users`)
    } else if (data.scope === 'department' && data.departmentIds) {
      for (const deptId of data.departmentIds) {
        targets.push({ departmentId: BigInt(deptId) })

        // Get all users in department and enroll them
        const department = await prisma.department.findUnique({
          where: { id: BigInt(deptId) },
          include: {
            members: true,
          },
        })

        if (department) {
          for (const member of department.members) {
            const existing = await prisma.enrollment.findFirst({
              where: {
                userId: member.id,
                courseId: BigInt(data.courseId),
              },
            })

            if (existing) {
              await prisma.enrollment.update({
                where: { id: existing.id },
                data: {
                  assignedViaAssignmentId: assignment.id,
                  dueAt: data.dueAt ? new Date(data.dueAt) : null,
                  mandatory: data.mandatory,
                },
              })
              enrollmentCount++
            } else {
              await prisma.enrollment.create({
                data: {
                  userId: member.id,
                  courseId: BigInt(data.courseId),
                  assignedViaAssignmentId: assignment.id,
                  status: 'assigned',
                  dueAt: data.dueAt ? new Date(data.dueAt) : null,
                  mandatory: data.mandatory,
                },
              })
              enrollmentCount++
              
              // Send notification
              if (course) {
                try {
                  await notifyAssignmentCreated(
                    member.id,
                    course.title,
                    data.dueAt ? new Date(data.dueAt) : null
                  )
                } catch (err) {
                  console.error('Error sending assignment notification:', err)
                }
              }
            }
          }
          console.log(`Assignment created: ${enrollmentCount} enrollments created for department ${deptId}`)
        }
      }
    } else if (data.scope === 'all') {
      // Enroll all active users
      const allUsers = await prisma.user.findMany({
        where: {
          status: 'active',
          deactivatedAt: null,
        },
      })

      for (const user of allUsers) {
        const existing = await prisma.enrollment.findFirst({
          where: {
            userId: user.id,
            courseId: BigInt(data.courseId),
          },
        })

        if (existing) {
          await prisma.enrollment.update({
            where: { id: existing.id },
            data: {
              assignedViaAssignmentId: assignment.id,
              dueAt: data.dueAt ? new Date(data.dueAt) : null,
              mandatory: data.mandatory,
            },
          })
          enrollmentCount++
        } else {
          await prisma.enrollment.create({
            data: {
              userId: user.id,
              courseId: BigInt(data.courseId),
              assignedViaAssignmentId: assignment.id,
              status: 'assigned',
              dueAt: data.dueAt ? new Date(data.dueAt) : null,
              mandatory: data.mandatory,
            },
          })
          enrollmentCount++
          
          // Send notification
          if (course) {
            try {
              await notifyAssignmentCreated(
                user.id,
                course.title,
                data.dueAt ? new Date(data.dueAt) : null
              )
            } catch (err) {
              console.error('Error sending assignment notification:', err)
            }
          }
        }
      }
      console.log(`Assignment created: ${enrollmentCount} enrollments created for all users`)
    }

    // Create assignment targets
    await prisma.assignmentTarget.createMany({
      data: targets.map(t => ({
        assignmentId: assignment.id,
        ...t,
      })),
    })

    // Log audit
    await logAudit(
      BigInt(user.id),
      'assignment_create',
      'assignment',
      assignment.id.toString(),
      req,
      {
        courseId: data.courseId,
        scope: data.scope,
        enrollmentCount,
        dueAt: data.dueAt || null,
        mandatory: data.mandatory,
      }
    )

    // Convert BigInt IDs to strings for JSON serialization
    const serializedAssignment = {
      ...assignment,
      id: assignment.id.toString(),
      courseId: assignment.courseId.toString(),
      assignedById: assignment.assignedById.toString(),
    }

    return NextResponse.json({ assignment: serializedAssignment })
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
    console.error('Create assignment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

