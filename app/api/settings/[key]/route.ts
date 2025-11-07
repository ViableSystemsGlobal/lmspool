import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hasAccess = currentUser.roles.includes('ADMIN') || currentUser.roles.includes('SUPER_ADMIN')
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { key } = await params

    const setting = await prisma.setting.findUnique({
      where: { key },
    })

    if (!setting) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ key, value: setting.value })
  } catch (error: any) {
    console.error('Get setting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only Super Admin can update critical settings
    const isSuperAdmin = currentUser.roles.includes('SUPER_ADMIN')
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { key } = await params
    const body = await req.json()
    const { value } = body

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      )
    }

    // Update or insert setting
    await prisma.setting.upsert({
      where: { key },
      update: {
        value: value as any,
        updatedBy: BigInt(currentUser.id),
      },
      create: {
        key,
        value: value as any,
        updatedBy: BigInt(currentUser.id),
      },
    })

    return NextResponse.json({ success: true, key, value })
  } catch (error: any) {
    console.error('Update setting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

