import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRoles, getCurrentUser } from './auth'

export function withAuth(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context: any) => {
    try {
      await requireAuth()
      return handler(req, context)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
}

export function withRoles(...allowedRoles: string[]) {
  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: any) => {
      try {
        await requireRoles(...allowedRoles)
        return handler(req, context)
      } catch (error: any) {
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }
  }
}

