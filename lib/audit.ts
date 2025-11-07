import { prisma } from './prisma'
import { NextRequest } from 'next/server'

export interface AuditLogData {
  actorUserId: bigint | null
  action: string
  entityType: string | null
  entityId: string | null
  req?: NextRequest
  meta?: Record<string, any>
  changedFields?: Record<string, { before: any; after: any }>
}

export async function logAudit(
  actorUserId: bigint | null,
  action: string,
  entityType: string | null,
  entityId: string | null,
  req?: NextRequest,
  meta?: Record<string, any>,
  changedFields?: Record<string, { before: any; after: any }>
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        ip: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
            req?.headers.get('x-real-ip') || 
            undefined,
        userAgent: req?.headers.get('user-agent') || undefined,
        meta: meta || {},
        changedFields: changedFields || undefined,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
    // Don't throw - audit logging shouldn't break the main flow
  }
}

// Helper to log changes with before/after values
export async function logAuditChange(
  actorUserId: bigint | null,
  action: string,
  entityType: string,
  entityId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  req?: NextRequest,
  meta?: Record<string, any>
) {
  const changedFields: Record<string, { before: any; after: any }> = {}
  
  // Compare old and new data to find changes
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  
  for (const key of allKeys) {
    const oldValue = oldData[key]
    const newValue = newData[key]
    
    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue
    }
    
    // Don't log sensitive fields
    const sensitiveFields = ['password', 'smtpPassword', 'clientSecret', 'apiKey', 'secret']
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      changedFields[key] = { before: '***', after: '***' }
    } else {
      changedFields[key] = { before: oldValue, after: newValue }
    }
  }
  
  await logAudit(actorUserId, action, entityType, entityId, req, meta, changedFields)
}

