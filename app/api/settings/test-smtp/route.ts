import { NextRequest, NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth'
import nodemailer from 'nodemailer'
import { z } from 'zod'

const testSmtpSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email(),
  testEmail: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    await requireRoles('ADMIN', 'SUPER_ADMIN')

    const body = await req.json()
    const data = testSmtpSchema.parse(body)

    // Determine if we should use secure connection
    // Port 465 typically uses SSL (secure: true)
    // Port 587 typically uses STARTTLS (secure: false, but requires tls)
    // If user explicitly set smtpSecure, use that; otherwise auto-detect based on port
    const useSecure = data.smtpPort === 465 ? true : (data.smtpSecure && data.smtpPort !== 587)
    
    // Create a test transporter with proper TLS configuration
    const transporterConfig: any = {
      host: data.smtpHost,
      port: data.smtpPort,
      secure: useSecure, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: data.smtpUser,
        pass: data.smtpPassword,
      },
    }
    
    // For STARTTLS (port 587 or when secure is false but not port 465)
    if (!useSecure && data.smtpPort !== 465) {
      transporterConfig.requireTLS = true
      transporterConfig.tls = {
        rejectUnauthorized: false, // Allow self-signed certificates for testing
        minVersion: 'TLSv1.2',
      }
    }
    
    const transporter = nodemailer.createTransport(transporterConfig)

    // Verify connection
    await transporter.verify()

    // Try to send a test email to the test email address
    try {
      await transporter.sendMail({
        from: `"LMS Test" <${data.fromEmail}>`,
        to: data.testEmail,
        subject: 'LMS SMTP Connection Test',
        text: 'This is a test email to verify your SMTP configuration is working correctly.',
        html: '<p>This is a test email to verify your SMTP configuration is working correctly.</p>',
      })
    } catch (sendError: any) {
      // If verification passed but sending failed, provide more details
      console.warn('SMTP verification passed but test email send failed:', sendError)
      throw new Error(`Connection verified but failed to send test email: ${sendError.message || 'Unknown error'}`)
    }

    return NextResponse.json({
      success: true,
      message: `SMTP connection successful! Test email sent to ${data.testEmail}`,
    })
  } catch (error: any) {
    console.error('SMTP test error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid SMTP configuration', details: error.issues },
        { status: 400 }
      )
    }

    // Parse nodemailer errors
    let errorMessage = 'Failed to connect to SMTP server'
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password.'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check the SMTP host and port.'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please check the SMTP host and port.'
    } else if (error.message?.includes('SSL') || error.message?.includes('TLS') || error.message?.includes('wrong version number')) {
      errorMessage = 'SSL/TLS connection error. Try changing the "Use SSL/TLS" setting or use port 587 for STARTTLS.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    )
  }
}

