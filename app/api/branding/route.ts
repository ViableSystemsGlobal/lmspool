import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default branding settings
const DEFAULT_BRANDING = {
  companyName: 'LMS - Learning Management System',
  logo: null as string | null,
  primaryColor: '#ea580c', // orange-600
  secondaryColor: '#f97316', // orange-500
  description: 'Learning Management System for Staff Training',
}

export async function GET() {
  try {
    // Get branding settings from database
    const brandingSetting = await prisma.setting.findUnique({
      where: { key: 'branding' },
    })

    let branding = { ...DEFAULT_BRANDING }

    if (brandingSetting?.value) {
      const storedBranding = brandingSetting.value as any
      branding = {
        companyName: storedBranding.companyName || DEFAULT_BRANDING.companyName,
        logo: storedBranding.logo || storedBranding.companyLogo || DEFAULT_BRANDING.logo,
        primaryColor: storedBranding.primaryColor || DEFAULT_BRANDING.primaryColor,
        secondaryColor: storedBranding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
        description: storedBranding.description || DEFAULT_BRANDING.description,
      }
    }

    return NextResponse.json({ branding })
  } catch (error: any) {
    console.error('Get branding error:', error)
    // Return defaults on error
    return NextResponse.json({ branding: DEFAULT_BRANDING })
  }
}

