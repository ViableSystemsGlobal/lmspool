import { NextRequest, NextResponse } from 'next/server'
import { requireRoles, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit, logAuditChange } from '@/lib/audit'

// Default settings structure
const DEFAULT_SETTINGS = {
  branding: {
    logo: null as string | null,
    primaryColor: '#ea580c' as string, // orange-600
    secondaryColor: '#f97316' as string, // orange-500
    fontFamily: 'Inter' as string,
  },
  localization: {
    defaultTimezone: 'Africa/Accra' as string,
    defaultLanguage: 'en' as string,
    dateFormat: 'MM/DD/YYYY' as string,
    timeFormat: '12h' as string, // '12h' | '24h'
  },
  course: {
    defaultPassMark: 70 as number,
    defaultQuizAttempts: 3 as number,
    defaultQuizRandomize: false as boolean,
    defaultCertificateExpiryDays: null as number | null,
    defaultAssignmentReminders: true as boolean,
  },
  security: {
    sessionTimeoutMinutes: 480 as number, // 8 hours
    require2FA: false as boolean,
    passwordMinLength: 8 as number,
    passwordRequireUppercase: true as boolean,
    passwordRequireLowercase: true as boolean,
    passwordRequireNumbers: true as boolean,
    passwordRequireSpecialChars: false as boolean,
  },
  integrations: {
    email: {
      provider: 'smtp' as string,
      smtpHost: '' as string,
      smtpPort: 587 as number,
      smtpUser: '' as string,
      smtpPassword: '' as string,
      smtpSecure: true as boolean,
      fromEmail: '' as string,
      fromName: '' as string,
    },
    sso: {
      enabled: false as boolean,
      provider: 'google' as string, // 'google' | 'microsoft' | 'okta'
      clientId: '' as string,
      clientSecret: '' as string,
    },
  },
  dataRetention: {
    userDataRetentionDays: 3650 as number, // 10 years
    progressLogRetentionDays: 730 as number, // 2 years
    auditLogRetentionDays: 2555 as number, // 7 years
    anonymizeAnalytics: false as boolean,
  },
  maintenance: {
    enabled: false as boolean,
    message: '' as string,
    scheduledStart: null as string | null,
    scheduledEnd: null as string | null,
  },
  legal: {
    termsOfServiceUrl: null as string | null,
    privacyPolicyUrl: null as string | null,
    requireAcceptanceOnLogin: false as boolean,
  },
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view settings
    const hasAccess = currentUser.roles.includes('ADMIN') || currentUser.roles.includes('SUPER_ADMIN')
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get all settings from database
    const settingsRecords = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    })

    // Convert to object - merge stored settings with defaults
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS }
    
    for (const record of settingsRecords) {
      // If key contains dot, it's a nested setting (old format)
      // Otherwise, it's a top-level category
      if (record.key.includes('.')) {
        const keys = record.key.split('.')
        let current: any = settings
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current)) {
            current[keys[i]] = {}
          }
          current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = record.value
      } else {
        // Top-level category - merge with defaults
        if (record.key in DEFAULT_SETTINGS) {
          settings[record.key] = { ...DEFAULT_SETTINGS[record.key as keyof typeof DEFAULT_SETTINGS], ...(record.value as object) }
        } else {
          settings[record.key] = record.value
        }
      }
    }

    // Mask sensitive fields
    if (settings.integrations?.email?.smtpPassword) {
      settings.integrations.email.smtpPassword = '***'
    }
    if (settings.integrations?.sso?.clientSecret) {
      settings.integrations.sso.clientSecret = '***'
    }

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can update settings
    const hasAccess = currentUser.roles.includes('ADMIN') || currentUser.roles.includes('SUPER_ADMIN')
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // If key contains dot, it's a nested setting
    // We need to fetch the parent category, update the nested value, and save it back
    if (key.includes('.')) {
      const keys = key.split('.')
      const categoryKey = keys[0]
      const nestedKey = keys.slice(1).join('.')

      // Get current category value or use default
      const currentCategory = await prisma.setting.findUnique({
        where: { key: categoryKey },
      })

      const categoryValue = currentCategory 
        ? (currentCategory.value as any)
        : DEFAULT_SETTINGS[categoryKey as keyof typeof DEFAULT_SETTINGS] || {}

      // Update nested value
      const updatedCategory = { ...categoryValue }
      const nestedKeys = keys.slice(1)
      let current: any = updatedCategory
      for (let i = 0; i < nestedKeys.length - 1; i++) {
        if (!(nestedKeys[i] in current)) {
          current[nestedKeys[i]] = {}
        }
        current = current[nestedKeys[i]]
      }
      current[nestedKeys[nestedKeys.length - 1]] = value

      // Get old value for audit logging
      const oldValue = currentCategory ? (currentCategory.value as any) : null

      // Save entire category
      await prisma.setting.upsert({
        where: { key: categoryKey },
        update: {
          value: updatedCategory as any,
          updatedBy: BigInt(currentUser.id),
        },
        create: {
          key: categoryKey,
          value: updatedCategory as any,
          updatedBy: BigInt(currentUser.id),
        },
      })

      // Log audit
      if (oldValue) {
        await logAuditChange(
          BigInt(currentUser.id),
          'settings_update',
          'setting',
          categoryKey,
          oldValue,
          updatedCategory,
          req
        )
      } else {
        await logAudit(
          BigInt(currentUser.id),
          'settings_create',
          'setting',
          categoryKey,
          req,
          { key: categoryKey }
        )
      }

      return NextResponse.json({ success: true, key, value })
    }

    // Get old value for audit logging
    const existing = await prisma.setting.findUnique({
      where: { key },
    })
    const oldValue = existing ? (existing.value as any) : null

    // Top-level category - save directly
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

    // Log audit
    if (oldValue) {
      await logAuditChange(
        BigInt(currentUser.id),
        'settings_update',
        'setting',
        key,
        oldValue,
        value,
        req
      )
    } else {
      await logAudit(
        BigInt(currentUser.id),
        'settings_create',
        'setting',
        key,
        req,
        { key }
      )
    }

    return NextResponse.json({ success: true, key, value })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
