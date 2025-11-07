import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
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

    const roles = await prisma.role.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    // Convert BigInt IDs to numbers for JSON serialization
    const serializedRoles = roles.map(role => ({
      ...role,
      id: Number(role.id),
    }))

    return NextResponse.json({ roles: serializedRoles })
  } catch (error) {
    console.error('Get roles error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

