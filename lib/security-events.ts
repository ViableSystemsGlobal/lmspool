import { prisma } from './prisma'

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical'
export type SecurityEventType = 
  | 'multiple_failed_logins'
  | 'mass_deletion'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'data_export'
  | 'settings_change'
  | 'role_change'
  | 'bulk_operation'

interface CreateSecurityEventParams {
  eventType: SecurityEventType
  description: string
  severity: SecurityEventSeverity
}

export async function createSecurityEvent(params: CreateSecurityEventParams) {
  try {
    const event = await prisma.securityEvent.create({
      data: {
        eventType: params.eventType,
        description: params.description,
        severity: params.severity,
      },
    })
    return event
  } catch (error) {
    console.error('Failed to create security event:', error)
    // Don't throw - security event logging shouldn't break the main flow
  }
}

// Monitor for suspicious patterns
export async function checkSuspiciousPatterns() {
  try {
    // Check for multiple failed logins in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const failedLogins = await prisma.auditLog.groupBy({
      by: ['ip', 'actorUserId'],
      where: {
        action: 'otp_failed',
        ts: { gte: oneHourAgo },
      },
      _count: {
        id: true,
      },
    })

    for (const group of failedLogins) {
      if (group._count.id >= 5) {
        // Check if event already exists
        const existingEvent = await prisma.securityEvent.findFirst({
          where: {
            eventType: 'multiple_failed_logins',
            resolvedAt: null,
            description: {
              contains: group.ip || group.actorUserId?.toString() || '',
            },
          },
        })

        if (!existingEvent) {
          await createSecurityEvent({
            eventType: 'multiple_failed_logins',
            description: `Multiple failed login attempts detected: ${group._count.id} attempts from IP ${group.ip || 'unknown'} in the last hour`,
            severity: group._count.id >= 10 ? 'high' : 'medium',
          })
        }
      }
    }

    // Check for mass deletions in last hour
    const massDeletions = await prisma.auditLog.groupBy({
      by: ['actorUserId', 'entityType'],
      where: {
        action: { contains: 'delete' },
        ts: { gte: oneHourAgo },
      },
      _count: {
        id: true,
      },
    })

    for (const group of massDeletions) {
      if (group._count.id >= 10) {
        const existingEvent = await prisma.securityEvent.findFirst({
          where: {
            eventType: 'mass_deletion',
            resolvedAt: null,
            description: {
              contains: group.entityType || '',
            },
          },
        })

        if (!existingEvent && group.actorUserId) {
          const user = await prisma.user.findUnique({
            where: { id: group.actorUserId },
            select: { name: true, email: true },
          })

          await createSecurityEvent({
            eventType: 'mass_deletion',
            description: `Mass deletion detected: ${group._count.id} ${group.entityType} items deleted by ${user?.name || user?.email || 'unknown'} in the last hour`,
            severity: 'high',
          })
        }
      }
    }
  } catch (error) {
    console.error('Failed to check suspicious patterns:', error)
  }
}

