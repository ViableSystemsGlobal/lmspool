import { prisma } from './prisma'
import { sendEmail, generateEmailTemplate, isEmailConfigured } from './email'

const OTP_EXPIRY_MINUTES = 10
const OTP_LENGTH = 6
const MAX_ATTEMPTS = 5

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createOTP(email: string, purpose: string = 'login') {
  const code = generateOTP()
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES)

  // Invalidate any existing OTPs for this email
  await prisma.authOtp.updateMany({
    where: {
      email,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      consumedAt: new Date(),
    },
  })

  // Create new OTP
  const otp = await prisma.authOtp.create({
    data: {
      email,
      code,
      purpose,
      expiresAt,
      attemptsLeft: MAX_ATTEMPTS,
    },
  })

  // Send email
  try {
    // Check if email is configured
    const emailConfigured = await isEmailConfigured()
    
    if (!emailConfigured) {
      console.warn('SMTP not configured. OTP code generated but not sent via email:', code)
      console.warn('Please configure SMTP settings in Admin > Settings > Integrations')
      // Continue without failing - code is still saved in database
      return otp
    }

    console.log('Attempting to send OTP email to:', email)

    // Use the email service
    const emailBody = `
      <p>Your one-time login code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb; text-align: center; margin: 20px 0;">${code}</h1>
      <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
    `

    const emailSent = await sendEmail({
      to: email,
      subject: 'Your LMS Login Code',
      html: await generateEmailTemplate('Your Login Code', emailBody),
    })

    if (!emailSent) {
      console.error('Failed to send OTP email - email service returned false')
      console.warn('OTP code (not sent):', code)
    } else {
      console.log('OTP email sent successfully to:', email)
    }
  } catch (error: any) {
    console.error('Failed to send OTP email:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
    })
    console.warn('OTP code (not sent):', code)
    // Continue even if email fails - code is still saved in database
  }

  // Log audit event
  await prisma.auditLog.create({
    data: {
      action: 'otp_requested',
      entityType: 'otp',
      entityId: otp.id.toString(),
      meta: { email },
    },
  })

  return otp
}

export async function verifyOTP(email: string, code: string): Promise<{ valid: boolean; userId?: bigint }> {
  const otp = await prisma.authOtp.findFirst({
    where: {
      email,
      code,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attemptsLeft: { gt: 0 },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!otp) {
    // Log failed attempt
    await prisma.auditLog.create({
      data: {
        action: 'otp_verify_failed',
        entityType: 'otp',
        meta: { email },
      },
    })
    return { valid: false }
  }

  // Check if user exists, create if not (for first-time login)
  let user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    // Auto-create user on first login (can be configured)
    user = await prisma.user.create({
      data: {
        email,
        name: email.split('@')[0], // Default name from email
        status: 'active',
      },
    })

    // Assign LEARNER role by default
    const learnerRole = await prisma.role.findUnique({
      where: { name: 'LEARNER' },
    })

    if (learnerRole) {
      try {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: learnerRole.id,
          },
        })
      } catch (error: any) {
        // Role might already exist, ignore error
        console.log('Role assignment note:', error.message)
      }
    }
  }

  // Mark OTP as consumed
  await prisma.authOtp.update({
    where: { id: otp.id },
    data: {
      consumedAt: new Date(),
    },
  })

  // Log successful verification
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'login_success',
      entityType: 'user',
      entityId: user.id.toString(),
      meta: { email },
    },
  })

  return { valid: true, userId: user.id }
}

export async function decrementOTPAttempts(email: string, code: string) {
  const otp = await prisma.authOtp.findFirst({
    where: {
      email,
      code,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (otp && otp.attemptsLeft > 0) {
    await prisma.authOtp.update({
      where: { id: otp.id },
      data: {
        attemptsLeft: otp.attemptsLeft - 1,
      },
    })

    if (otp.attemptsLeft <= 1) {
      // Log lockout
      await prisma.auditLog.create({
        data: {
          action: 'otp_lockout',
          entityType: 'otp',
          entityId: otp.id.toString(),
          meta: { email },
        },
      })
    }
  }
}

