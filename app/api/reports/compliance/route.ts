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

    const searchParams = req.nextUrl.searchParams
    const departmentId = searchParams.get('departmentId')
    const format = searchParams.get('format') // json|csv

    // Managers can only see their team's data
    const isManager = currentUser.roles.includes('MANAGER') && !currentUser.roles.includes('ADMIN')
    let managerDepartmentId: bigint | null = null

    if (isManager) {
      const manager = await prisma.user.findUnique({
        where: { id: BigInt(currentUser.id) },
        include: { managedDepartment: true },
      })
      managerDepartmentId = manager?.managedDepartment?.id || null
    }

    // Get mandatory enrollments
    const where: any = {
      mandatory: true,
    }

    if (departmentId || managerDepartmentId) {
      const deptId = departmentId ? BigInt(departmentId) : managerDepartmentId
      where.user = {
        departmentId: deptId,
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        user: {
          include: {
            department: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
    })

    // Get compliance data
    const reportData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const isOverdue = enrollment.dueAt && new Date(enrollment.dueAt) < new Date() && enrollment.status !== 'completed'
        const isDueSoon = enrollment.dueAt && !isOverdue && enrollment.status !== 'completed' && new Date(enrollment.dueAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000

        // Get certificate if completed
        const certificate = enrollment.certificateId
          ? await prisma.certificate.findUnique({
              where: { id: enrollment.certificateId },
              select: {
                number: true,
                issuedAt: true,
                expiryAt: true,
              },
            })
          : null

        return {
          userId: enrollment.userId.toString(),
          userName: enrollment.user.name,
          userEmail: enrollment.user.email,
          department: enrollment.user.department?.name || 'N/A',
          courseId: enrollment.courseId.toString(),
          courseTitle: enrollment.course.title,
          courseCategory: enrollment.course.category || 'N/A',
          status: enrollment.status,
          mandatory: enrollment.mandatory,
          dueAt: enrollment.dueAt?.toISOString() || null,
          completedAt: enrollment.completedAt?.toISOString() || null,
          isOverdue,
          isDueSoon,
          certificateNumber: certificate?.number || null,
          certificateIssuedAt: certificate?.issuedAt?.toISOString() || null,
          certificateExpiryAt: certificate?.expiryAt?.toISOString() || null,
          daysUntilDue: enrollment.dueAt
            ? Math.ceil((new Date(enrollment.dueAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : null,
        }
      })
    )

    // If CSV format requested
    if (format === 'csv') {
      const csvHeaders = [
        'User Name',
        'Email',
        'Department',
        'Course Title',
        'Category',
        'Status',
        'Due Date',
        'Days Until Due',
        'Completed At',
        'Overdue',
        'Due Soon',
        'Certificate Number',
        'Certificate Issued',
        'Certificate Expiry',
      ].join(',')

      const csvRows = reportData.map(row => [
        `"${row.userName}"`,
        `"${row.userEmail}"`,
        `"${row.department}"`,
        `"${row.courseTitle}"`,
        `"${row.courseCategory}"`,
        `"${row.status}"`,
        row.dueAt || '',
        row.daysUntilDue !== null ? row.daysUntilDue.toString() : '',
        row.completedAt || '',
        row.isOverdue ? 'Yes' : 'No',
        row.isDueSoon ? 'Yes' : 'No',
        row.certificateNumber || '',
        row.certificateIssuedAt || '',
        row.certificateExpiryAt || '',
      ].join(','))

      const csvContent = [csvHeaders, ...csvRows].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${Date.now()}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      report: 'Compliance Status Report',
      totalRecords: reportData.length,
      data: reportData,
      summary: {
        totalMandatory: reportData.length,
        totalCompleted: reportData.filter(r => r.status === 'completed').length,
        totalInProgress: reportData.filter(r => r.status === 'started').length,
        totalOverdue: reportData.filter(r => r.isOverdue).length,
        totalDueSoon: reportData.filter(r => r.isDueSoon).length,
        complianceRate: reportData.length > 0
          ? Math.round((reportData.filter(r => r.status === 'completed').length / reportData.length) * 100)
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
    console.error('Compliance report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

