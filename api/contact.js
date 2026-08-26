const nodemailer = require('nodemailer')

const RECIPIENT_CAREERS = 'careers@avzdax.com'
const RECIPIENT_BUSINESS = 'business@avzdax.com'
const SUBJECT_PREFIX = '[AVZDAX Contact] '

const ALLOWED_INQUIRY_TYPES = [
  'General Inquiry',
  'Sales',
  'Partnership',
  'Media / Press',
  'Support'
]

const stripTags = (value) => String(value ?? '').replace(/<[^>]*>/g, '').trim()

const isValidEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)

const lagosTimestamp = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date())

  const get = (type) => parts.find((part) => part.type === type).value
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

const senderIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'unknown'

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, message: 'Method Not Allowed' })
  }

  const body = req.body ?? {}

  if (stripTags(body.website)) {
    return res.status(200).json({ success: true, message: 'Request received.' })
  }

  const firstName = stripTags(body.first_name)
  const lastName = stripTags(body.last_name)
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = stripTags(body.phone)
  const industry = stripTags(body.industry)
  const inquiryType = stripTags(body.inquiry_type)
  const message = stripTags(body.message)

  const errors = []
  if (!firstName || !lastName) errors.push('Name is required.')
  if (!isValidEmail(email)) errors.push('A valid email address is required.')
  if (!inquiryType) errors.push('Inquiry type is required.')
  if (!message) errors.push('Message is required.')

  if (errors.length) {
    return res.status(400).json({ success: false, message: errors.join(' ') })
  }

  if (!ALLOWED_INQUIRY_TYPES.includes(inquiryType)) {
    return res.status(400).json({ success: false, message: 'Inquiry type is not recognised.' })
  }

  const isCareer = inquiryType.toLowerCase().includes('career')
  const recipient = isCareer ? RECIPIENT_CAREERS : RECIPIENT_BUSINESS
  const submittedAt = lagosTimestamp()

  const emailBody = [
    'New Contact Form Submission',
    '',
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Industry: ${industry}`,
    `Inquiry Type: ${inquiryType}`,
    '',
    'Message:',
    message,
    '',
    '--------------------------------------------------',
    `Sender IP: ${senderIp(req)}`,
    `Timestamp: ${submittedAt}`,
    ''
  ].join('\n')

  const smtpUser = process.env.SMTP_USER || 'support@avzdax.com'

  if (!process.env.SMTP_PASSWORD) {
    console.error('SMTP_PASSWORD is not configured')
    return res
      .status(500)
      .json({ success: false, message: 'Unable to send email. Please try again later.' })
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.protonmail.ch',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: process.env.SMTP_PASSWORD }
  })

  try {
    await transporter.sendMail({
      from: { name: 'AVZDAX', address: smtpUser },
      to: recipient,
      replyTo: { name: `${firstName} ${lastName}`, address: email },
      subject: `${SUBJECT_PREFIX}${inquiryType} - ${firstName} ${lastName}`,
      text: emailBody
    })

    return res.status(200).json({ success: true, message: 'Thank you. Your request has been sent.' })
  } catch (error) {
    console.error('Contact form delivery failed:', error.message)
    return res
      .status(500)
      .json({ success: false, message: 'Unable to send email. Please try again later.' })
  }
}
