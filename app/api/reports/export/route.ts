import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    const hasAccess = currentUser.roles.includes('ADMIN') || 
                      currentUser.roles.includes('SUPER_ADMIN') || 
                      currentUser.roles.includes('MANAGER')
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const departmentId = searchParams.get('departmentId')
    const reportType = searchParams.get('reportType') || 'course' // course|learner|compliance
    const type = searchParams.get('type') || 'course' // Legacy support

    // Determine which report to generate
    const actualReportType = reportType === 'courses' || (type === 'course' && courseId) ? 'courses' 
      : reportType === 'learners' ? 'learners'
      : reportType === 'compliance' ? 'compliance'
      : 'course'
    
    // For new report types, redirect to their endpoints
    if (actualReportType === 'courses' && courseId) {
      // Redirect to course report endpoint
      const url = new URL('/api/reports/courses', req.url)
      if (courseId) url.searchParams.set('courseId', courseId)
      if (departmentId) url.searchParams.set('departmentId', departmentId)
      url.searchParams.set('format', 'csv')
      return NextResponse.redirect(url)
    } else if (actualReportType === 'learners') {
      // Redirect to learner report endpoint
      const url = new URL('/api/reports/learners', req.url)
      if (departmentId) url.searchParams.set('departmentId', departmentId)
      url.searchParams.set('format', 'csv')
      return NextResponse.redirect(url)
    } else if (actualReportType === 'compliance') {
      // Redirect to compliance report endpoint
      const url = new URL('/api/reports/compliance', req.url)
      if (departmentId) url.searchParams.set('departmentId', departmentId)
      url.searchParams.set('format', 'csv')
      return NextResponse.redirect(url)
    }

    let csvContent = ''

    // Legacy course report
    if (type === 'course' && courseId) {
      // Course completion report
      const course = await prisma.course.findUnique({
        where: { id: BigInt(courseId) },
        include: {
          enrollments: {
            include: {
              user: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
      })

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }

      csvContent = 'User Name,Email,Department,Status,Started At,Completed At,Score\n'
      
      for (const enrollment of course.enrollments) {
        // Get quiz score if available
        const quizAttempt = await prisma.quizAttempt.findFirst({
          where: {
            userId: enrollment.userId,
            quiz: {
              courseId: BigInt(courseId),
            },
            submittedAt: { not: null },
          },
          orderBy: {
            attemptNo: 'desc',
          },
        })

        csvContent += `"${enrollment.user.name}","${enrollment.user.email}","${enrollment.user.department?.name || ''}","${enrollment.status}","${enrollment.startedAt?.toISOString() || ''}","${enrollment.completedAt?.toISOString() || ''}","${quizAttempt?.score || ''}"\n`
      }
    } else if (type === 'team' && departmentId) {
      // Team report
      const department = await prisma.department.findUnique({
        where: { id: BigInt(departmentId) },
        include: {
          members: {
            include: {
              enrollments: {
                include: {
                  course: true,
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

      csvContent = 'User Name,Email,Course,Status,Due Date,Completed At\n'

      for (const member of department.members) {
        for (const enrollment of member.enrollments) {
          csvContent += `"${member.name}","${member.email}","${enrollment.course.title}","${enrollment.status}","${enrollment.dueAt?.toISOString() || ''}","${enrollment.completedAt?.toISOString() || ''}"\n`
        }
      }
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report-${Date.now()}.csv"`,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('Export report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

