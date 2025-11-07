import nodemailer from 'nodemailer'
import { prisma } from './prisma'

// Email configuration from environment variables (fallback)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null
let lastConfigHash: string | null = null

async function getTransporterConfig() {
  try {
    // Always try to get from database settings first (don't cache)
    const emailSettings = await prisma.setting.findUnique({
      where: { key: 'integrations' },
    })

    if (emailSettings?.value) {
      const integrations = emailSettings.value as any
      if (integrations?.email) {
        const emailConfig = integrations.email
        // Check if SMTP is configured
        if (emailConfig.smtpHost && emailConfig.smtpUser && emailConfig.smtpPassword) {
          const useSecure = emailConfig.smtpPort === 465 ? true : (emailConfig.smtpSecure && emailConfig.smtpPort !== 587)
          
          const config = {
            host: emailConfig.smtpHost,
            port: emailConfig.smtpPort || 587,
            secure: useSecure,
            auth: {
              user: emailConfig.smtpUser,
              pass: emailConfig.smtpPassword,
            },
            tls: !useSecure && emailConfig.smtpPort !== 465 ? {
              rejectUnauthorized: false,
              minVersion: 'TLSv1.2',
            } : undefined,
            from: emailConfig.fromEmail || emailConfig.smtpUser,
            fromName: emailConfig.fromName || 'LMS',
          }
          
          console.log('Loaded SMTP config from database:', {
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.auth.user,
            from: config.from,
          })
          
          return config
        } else {
          console.warn('SMTP config in database is incomplete:', {
            hasHost: !!emailConfig.smtpHost,
            hasUser: !!emailConfig.smtpUser,
            hasPassword: !!emailConfig.smtpPassword,
          })
        }
      }
    }
  } catch (error: any) {
    console.error('Failed to load email settings from database:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    })
  }

  // Fall back to environment variables
  if (SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass) {
    console.log('Using SMTP config from environment variables')
    return {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth,
      from: process.env.SMTP_FROM || SMTP_CONFIG.auth.user,
      fromName: 'LMS',
    }
  }

  console.warn('No SMTP configuration found in database or environment variables')
  return null
}

function getTransporter() {
  return transporter
}

async function createTransporter() {
  const config = await getTransporterConfig()
  
  if (!config) {
    return null
  }

  // Create a hash of the config to detect changes
  const configHash = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    from: config.from,
  })

  // If config changed or transporter doesn't exist, recreate transporter
  if (!transporter || configHash !== lastConfigHash) {
    console.log('Creating new SMTP transporter with config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
    })
    
    const transportConfig: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    }
    
    if ('tls' in config && config.tls) {
      transportConfig.tls = config.tls
    }
    
    transporter = nodemailer.createTransport(transportConfig)
    
    // Store config hash for comparison
    lastConfigHash = configHash
  }
  
  return transporter
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const emailTransporter = await createTransporter()
    
    // If SMTP is not configured, log and return false
    if (!emailTransporter) {
      console.warn('SMTP not configured. Email not sent:', params.subject)
      return false
    }

    const config = await getTransporterConfig()
    if (!config) {
      console.warn('SMTP configuration not available. Email not sent:', params.subject)
      return false
    }

    const from = config.from ? `"${config.fromName || 'LMS'}" <${config.from}>` : `"LMS" <${config.auth.user}>`

    const info = await emailTransporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text || params.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html: params.html,
    })

    console.log('Email sent successfully:', info.messageId, 'to:', params.to)
    return true
  } catch (error: any) {
    console.error('Error sending email:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    })
    return false
  }
}

/**
 * Check if email is configured (from database or environment)
 */
export async function isEmailConfigured(): Promise<boolean> {
  try {
    // Check database settings first
    const emailSettings = await prisma.setting.findUnique({
      where: { key: 'integrations' },
    })

    if (emailSettings?.value) {
      const integrations = emailSettings.value as any
      if (integrations?.email?.smtpHost && integrations?.email?.smtpUser && integrations?.email?.smtpPassword) {
        return true
      }
    }
  } catch (error) {
    // Ignore errors
  }

  // Fall back to environment variables
  return !!(SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass)
}

/**
 * Check if email is configured (synchronous version - checks env only)
 */
export function isEmailConfiguredSync(): boolean {
  return !!(SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass)
}

/**
 * Generate HTML email template with branding
 */
export async function generateEmailTemplate(
  title: string,
  content: string,
  actionUrl?: string,
  actionText?: string
): Promise<string> {
  // Get branding settings
  let primaryColor = '#ea580c' // Default orange
  let companyName = 'LMS'
  let logoUrl = ''
  
  try {
    const brandingSettings = await prisma.setting.findUnique({
      where: { key: 'branding' },
    })
    
    if (brandingSettings?.value) {
      const branding = brandingSettings.value as any
      primaryColor = branding.primaryColor || primaryColor
      companyName = branding.companyName || companyName
      logoUrl = branding.logo || ''
    }
  } catch (error) {
    // Use defaults if branding fetch fails
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${logoUrl ? `
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="${logoUrl}" alt="${companyName}" style="max-height: 60px; max-width: 200px;" />
  </div>
  ` : ''}
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: ${primaryColor}; margin: 0;">${title}</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
    ${content}
    
    ${actionUrl && actionText ? `
    <div style="margin-top: 30px; text-align: center;">
      <a href="${actionUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        ${actionText}
      </a>
    </div>
    ` : ''}
  </div>
  
  <div style="margin-top: 20px; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
    <p>This is an automated email from ${companyName}.</p>
    <p>If you have any questions, please contact your administrator.</p>
  </div>
</body>
</html>
  `.trim()
}

