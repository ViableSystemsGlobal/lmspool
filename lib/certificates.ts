import PDFDocument from 'pdfkit'
import { prisma } from './prisma'
import { randomBytes } from 'crypto'
import { writeFile, mkdir, createWriteStream } from 'fs'
import { promises as fsPromises } from 'fs'
import { join } from 'path'
import { existsSync } from 'fs'
import { toBuffer } from 'qrcode'
import { readFileSync } from 'fs'

const CERTIFICATES_PATH = process.env.CERTIFICATES_PATH || './certificates'
const QR_CODE_PATH = process.env.QR_CODE_PATH || './certificates/qrcodes'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004'

export async function generateCertificate(
  userId: bigint,
  courseId: bigint,
  score: number,
  maxScore: number,
  templateId?: bigint,
  expiryDays?: number | null
): Promise<{ certificateId: bigint; pdfUrl: string; number: string; qrCodeUrl: string | null }> {
  // Get user and course
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  })

  if (!user || !course) {
    throw new Error('User or course not found')
  }

  // Get template if specified
  let template = null
  if (templateId) {
    template = await prisma.certificateTemplate.findUnique({
      where: { id: templateId },
    })
  }

  // Generate unique certificate number
  const number = `CERT-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`

  // Create directories if they don't exist
  if (!existsSync(CERTIFICATES_PATH)) {
    await fsPromises.mkdir(CERTIFICATES_PATH, { recursive: true })
  }
  if (!existsSync(QR_CODE_PATH)) {
    await fsPromises.mkdir(QR_CODE_PATH, { recursive: true })
  }

  // Generate verification URL
  const verifyUrl = `${BASE_URL}/certificates/verify/${number}`

  // Generate QR code
  const qrCodeFilename = `${number}.png`
  const qrCodePath = join(QR_CODE_PATH, qrCodeFilename)
  const qrCodeBuffer = await toBuffer(verifyUrl, { errorCorrectionLevel: 'M', width: 200 })
  await fsPromises.writeFile(qrCodePath, qrCodeBuffer)
  const qrCodeUrl = `/api/certificates/qrcodes/${qrCodeFilename}`

  // Get branding settings
  let brandingLogo: Buffer | null = null
  let primaryColor = '#ea580c' // Default orange
  let companyName = 'LMS'
  
  try {
    const brandingSettings = await prisma.setting.findUnique({
      where: { key: 'branding' },
    })
    
    if (brandingSettings?.value) {
      const branding = brandingSettings.value as any
      primaryColor = branding.primaryColor || primaryColor
      companyName = branding.companyName || companyName
      
      // Try to load logo if URL is provided
      if (branding.logo) {
        try {
          // If logo is a URL, try to fetch it
          if (branding.logo.startsWith('http') || branding.logo.startsWith('/')) {
            // For now, skip logo loading from URL in PDF generation
            // This would require additional HTTP client setup
            // Logo can be added later if needed
          }
        } catch (error) {
          console.warn('Failed to load branding logo for certificate:', error)
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load branding settings for certificate:', error)
  }

  // Convert hex color to RGB for PDFKit
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255,
        ]
      : [0.9176, 0.3451, 0.0471] // Default orange RGB
  }
  
  const [r, g, b] = hexToRgb(primaryColor)

  // Generate PDF
  const filename = `${number}.pdf`
  const filepath = join(CERTIFICATES_PATH, filename)

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  })

  // Pipe to file
  const writeStream = createWriteStream(filepath)
  doc.pipe(writeStream)

  // Add border with branding color
  doc.rect(50, 50, doc.page.width - 100, doc.page.height - 100)
    .lineWidth(3)
    .strokeColor(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`)
    .stroke()

  // Add logo at top if available (can be enhanced later)
  // doc.image(logo, x, y, { width, height })

  // Certificate content with branding color
  doc.fillColor(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`)
    .fontSize(32)
    .text('Certificate of Completion', { align: 'center' })
    .moveDown()
    .fillColor('black')
    .fontSize(18)
    .text('This is to certify that', { align: 'center' })
    .moveDown()
    .fontSize(28)
    .fillColor(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`)
    .text(user.name, { align: 'center', underline: true })
    .moveDown()
    .fillColor('black')
    .fontSize(18)
    .text('has successfully completed the course', { align: 'center' })
    .moveDown()
    .fontSize(24)
    .fillColor(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`)
    .text(course.title, { align: 'center', underline: true })
    .moveDown(2)
    .fillColor('black')
    .fontSize(14)
    .text(`Score: ${score}/${maxScore} (${Math.round((score / maxScore) * 100)}%)`, { align: 'center' })
    .moveDown()
    .fontSize(12)
    .text(`Certificate Number: ${number}`, { align: 'center' })
    .moveDown(3)
    .fontSize(10)
    .text(`Issued on: ${new Date().toLocaleDateString()}`, { align: 'center' })
    .moveDown()
    .fontSize(10)
    .fillColor(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`)
    .text(companyName, { align: 'center' })

  // Add QR code at bottom right
  doc.image(qrCodeBuffer, doc.page.width - 150, doc.page.height - 150, {
    width: 100,
    height: 100,
  })
  doc.fontSize(8).text('Verify at:', doc.page.width - 150, doc.page.height - 155, {
    width: 100,
    align: 'center',
  })

  // Finalize PDF
  doc.end()

  // Wait for file to be written
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve())
    writeStream.on('error', reject)
  })

  // Calculate expiry date if specified
  const issuedAt = new Date()
  const expiryAt = expiryDays ? new Date(issuedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null

  // Save to database
  const certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      number,
      pdfUrl: `/api/certificates/${filename}`,
      qrCodeUrl,
      templateId: template?.id || null,
      issuedAt,
      expiryAt,
    },
  })

  return {
    certificateId: certificate.id,
    pdfUrl: certificate.pdfUrl,
    number: certificate.number,
    qrCodeUrl: certificate.qrCodeUrl,
  }
}

