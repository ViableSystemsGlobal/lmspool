import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const bulkActionSchema = z.object({
  courseIds: z.array(z.string()).min(1),
  action: z.enum(['delete', 'publish', 'archive', 'draft']),
})

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const { courseIds, action } = bulkActionSchema.parse(body)

    // Get current user for audit logging
    const currentUser = await getCurrentUser()

    const ids = courseIds.map(id => BigInt(id))

    // Verify all courses exist
    const existing = await prisma.course.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    if (existing.length !== courseIds.length) {
      return NextResponse.json(
        { error: 'Some courses not found' },
        { status: 404 }
      )
    }

    let updateData: any = {}
    
    switch (action) {
      case 'publish':
        updateData.status = 'published'
        break
      case 'archive':
        updateData.status = 'archived'
        break
      case 'draft':
        updateData.status = 'draft'
        break
      case 'delete':
        // Get course titles for audit logging
        const coursesToDelete = await prisma.course.findMany({
          where: { id: { in: ids } },
          select: { id: true, title: true },
        })

        // Log audit before deletion
        for (const course of coursesToDelete) {
          await logAudit(
            currentUser ? BigInt(currentUser.id) : null,
            'course_delete',
            'course',
            course.id.toString(),
            req,
            { title: course.title, bulkAction: true }
          )
        }

        // Delete courses
        await prisma.course.deleteMany({
          where: { id: { in: ids } },
        })
        return NextResponse.json({ 
          success: true, 
          deleted: courseIds.length 
        })
    }

    // Get course titles for audit logging
    const coursesToUpdate = await prisma.course.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, status: true },
    })

    // Update courses
    const result = await prisma.course.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    // Log audit for bulk update
    for (const course of coursesToUpdate) {
      await logAudit(
        currentUser ? BigInt(currentUser.id) : null,
        `course_bulk_${action}`,
        'course',
        course.id.toString(),
        req,
        { title: course.title, oldStatus: course.status, newStatus: updateData.status, bulkAction: true }
      )
    }

    return NextResponse.json({ 
      success: true, 
      updated: result.count 
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 })
    }
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({
        error: error.message
      }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    
    console.error('Bulk action error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}
