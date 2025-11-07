import { prisma } from './prisma'
import { sendEmail, generateEmailTemplate, isEmailConfigured } from './email'

export type NotificationType = 
  | 'assignment'
  | 'reminder'
  | 'completion'
  | 'expiry'
  | 'certificate'
  | 'overdue'
  | 'system'

export type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'push'
  | 'in_app'

interface CreateNotificationParams {
  userId: bigint
  type: NotificationType
  channel: NotificationChannel
  subject?: string
  body: string
  sendAt?: Date
  metaJson?: Record<string, any>
}

/**
 * Check if user has opted in for email notifications
 */
async function isEmailOptedIn(userId: bigint): Promise<boolean> {
  const preference = await prisma.userNotificationPreference.findUnique({
    where: {
      userId_channel: {
        userId,
        channel: 'email',
      },
    },
  })
  
  // Default to opted in if no preference exists
  return preference?.optIn !== false
}

/**
 * Get user email address
 */
async function getUserEmail(userId: bigint): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  
  return user?.email || null
}

/**
 * Create a notification
 */
export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      channel: params.channel,
      subject: params.subject,
      body: params.body,
      sendAt: params.sendAt,
      metaJson: params.metaJson || {},
      status: params.sendAt && params.sendAt > new Date() ? 'queued' : 'queued',
    },
  })

  // Send email if channel is email and email is configured
  if (params.channel === 'email' && await isEmailConfigured()) {
    const userEmail = await getUserEmail(params.userId)
    const optedIn = await isEmailOptedIn(params.userId)
    
    if (userEmail && optedIn) {
      const htmlContent = await generateEmailTemplate(
        params.subject || 'Notification',
        params.body.replace(/\n/g, '<br>'),
        params.metaJson?.actionUrl,
        params.metaJson?.actionText
      )
      
      await sendEmail({
        to: userEmail,
        subject: params.subject || 'Notification',
        html: htmlContent,
      })
    }
  }

  return notification
}

/**
 * Create in-app notification for assignment
 */
export async function notifyAssignmentCreated(
  userId: bigint,
  courseTitle: string,
  dueAt?: Date | null,
  courseUrl?: string
) {
  const subject = `New Course Assignment: ${courseTitle}`
  const body = `You have been assigned to complete "${courseTitle}".${
    dueAt ? ` This assignment is due on ${dueAt.toLocaleDateString()}.` : ''
  }`

  // Create in-app notification
  await createNotification({
    userId,
    type: 'assignment',
    channel: 'in_app',
    subject,
    body,
    metaJson: { courseTitle, dueAt: dueAt?.toISOString(), courseUrl },
  })

  // Send email notification if opted in
  const optedIn = await isEmailOptedIn(userId)
  if (await isEmailConfigured() && optedIn) {
    const userEmail = await getUserEmail(userId)
    if (userEmail) {
      const emailBody = `
        <p>You have been assigned to complete the course <strong>${courseTitle}</strong>.</p>
        ${dueAt ? `<p>This assignment is due on <strong>${dueAt.toLocaleDateString()}</strong>.</p>` : ''}
        <p>Please log in to your learning dashboard to access the course.</p>
      `
      
      const actionUrl = courseUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/learn/dashboard`
      
      await sendEmail({
        to: userEmail,
        subject,
        html: await generateEmailTemplate(subject, emailBody, actionUrl, 'View Course'),
      })
    }
  }
}

/**
 * Create reminder notification
 */
export async function notifyReminder(
  userId: bigint,
  courseTitle: string,
  daysUntilDue: number,
  dueAt: Date,
  courseUrl?: string
) {
  const subject = daysUntilDue === 0
    ? `Due Today: ${courseTitle}`
    : `Reminder: ${courseTitle} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`
  
  const body = daysUntilDue === 0
    ? `Your assignment "${courseTitle}" is due today. Please complete it as soon as possible.`
    : `This is a reminder that your assignment "${courseTitle}" is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} (${dueAt.toLocaleDateString()}).`

  // Create in-app notification
  await createNotification({
    userId,
    type: 'reminder',
    channel: 'in_app',
    subject,
    body,
    metaJson: { courseTitle, daysUntilDue, dueAt: dueAt.toISOString(), courseUrl },
  })

  // Send email notification if opted in
  const optedIn = await isEmailOptedIn(userId)
  if (await isEmailConfigured() && optedIn) {
    const userEmail = await getUserEmail(userId)
    if (userEmail) {
      const emailBody = daysUntilDue === 0
        ? `<p>Your assignment <strong>${courseTitle}</strong> is due <strong>today</strong>. Please complete it as soon as possible.</p>`
        : `<p>This is a reminder that your assignment <strong>${courseTitle}</strong> is due in <strong>${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}</strong> (${dueAt.toLocaleDateString()}).</p>`
      
      const actionUrl = courseUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/learn/dashboard`
      
      await sendEmail({
        to: userEmail,
        subject,
        html: await generateEmailTemplate(subject, emailBody, actionUrl, 'Continue Learning'),
      })
    }
  }
}

/**
 * Create completion notification
 */
export async function notifyCourseCompleted(
  userId: bigint,
  courseTitle: string,
  score?: number,
  maxScore?: number,
  certificateUrl?: string
) {
  const subject = `Course Completed: ${courseTitle}`
  const body = score !== undefined && maxScore !== undefined
    ? `Congratulations! You have successfully completed "${courseTitle}" with a score of ${score}/${maxScore} (${Math.round((score / maxScore) * 100)}%).`
    : `Congratulations! You have successfully completed "${courseTitle}".`

  // Create in-app notification
  await createNotification({
    userId,
    type: 'completion',
    channel: 'in_app',
    subject,
    body,
    metaJson: { courseTitle, score, maxScore, certificateUrl },
  })

  // Send email notification if opted in
  const optedIn = await isEmailOptedIn(userId)
  if (await isEmailConfigured() && optedIn) {
    const userEmail = await getUserEmail(userId)
    if (userEmail) {
      const scoreText = score !== undefined && maxScore !== undefined
        ? `<p>You scored <strong>${score}/${maxScore}</strong> (${Math.round((score / maxScore) * 100)}%).</p>`
        : ''
      
      const emailBody = `
        <p>Congratulations! You have successfully completed the course <strong>${courseTitle}</strong>.</p>
        ${scoreText}
        ${certificateUrl ? '<p>Your certificate is now available for download.</p>' : ''}
      `
      
      const actionUrl = certificateUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/learn/certificates`
      const actionText = certificateUrl ? 'Download Certificate' : 'View Certificates'
      
      await sendEmail({
        to: userEmail,
        subject,
        html: await generateEmailTemplate(subject, emailBody, actionUrl, actionText),
      })
    }
  }
}

/**
 * Create certificate notification
 */
export async function notifyCertificateIssued(
  userId: bigint,
  courseTitle: string,
  certificateNumber: string,
  certificateUrl?: string
) {
  const subject = `Certificate Issued: ${courseTitle}`
  const body = `Congratulations! You have earned a certificate for completing "${courseTitle}". Certificate number: ${certificateNumber}. You can download it from your certificates page.`

  // Create in-app notification
  await createNotification({
    userId,
    type: 'certificate',
    channel: 'in_app',
    subject,
    body,
    metaJson: { courseTitle, certificateNumber, certificateUrl },
  })

  // Send email notification if opted in
  const optedIn = await isEmailOptedIn(userId)
  if (await isEmailConfigured() && optedIn) {
    const userEmail = await getUserEmail(userId)
    if (userEmail) {
      const emailBody = `
        <p>Congratulations! You have earned a certificate for completing <strong>${courseTitle}</strong>.</p>
        <p>Certificate number: <strong>${certificateNumber}</strong></p>
        <p>You can download your certificate from your certificates page.</p>
      `
      
      const actionUrl = certificateUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/learn/certificates`
      
      await sendEmail({
        to: userEmail,
        subject,
        html: await generateEmailTemplate(subject, emailBody, actionUrl, 'Download Certificate'),
      })
    }
  }
}

/**
 * Create overdue notification
 */
export async function notifyOverdue(
  userId: bigint,
  courseTitle: string,
  dueAt: Date,
  courseUrl?: string
) {
  const subject = `Overdue Assignment: ${courseTitle}`
  const body = `Your assignment "${courseTitle}" was due on ${dueAt.toLocaleDateString()} and is now overdue. Please complete it as soon as possible.`

  // Create in-app notification
  await createNotification({
    userId,
    type: 'overdue',
    channel: 'in_app',
    subject,
    body,
    metaJson: { courseTitle, dueAt: dueAt.toISOString(), courseUrl },
  })

  // Send email notification if opted in
  const optedIn = await isEmailOptedIn(userId)
  if (await isEmailConfigured() && optedIn) {
    const userEmail = await getUserEmail(userId)
    if (userEmail) {
      const emailBody = `
        <p>Your assignment <strong>${courseTitle}</strong> was due on <strong>${dueAt.toLocaleDateString()}</strong> and is now overdue.</p>
        <p>Please complete it as soon as possible.</p>
      `
      
      const actionUrl = courseUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/learn/dashboard`
      
      await sendEmail({
        to: userEmail,
        subject,
        html: await generateEmailTemplate(subject, emailBody, actionUrl, 'Complete Course'),
      })
    }
  }
}

/**
 * Notify manager when team member completes course
 */
export async function notifyManagerTeamCompletion(
  managerUserId: bigint,
  teamMemberName: string,
  courseTitle: string
) {
  const subject = `Team Member Completed Course`
  const body = `${teamMemberName} has completed the course "${courseTitle}".`

  return createNotification({
    userId: managerUserId,
    type: 'completion',
    channel: 'in_app',
    subject,
    body,
  })
}

/**
 * Bulk create notifications for multiple users
 */
export async function createBulkNotifications(params: Omit<CreateNotificationParams, 'userId'> & { userIds: bigint[] }) {
  const notifications = await Promise.all(
    params.userIds.map(userId =>
      createNotification({
        ...params,
        userId,
      })
    )
  )

  return notifications
}

