const nodemailer = require('nodemailer')
const { google } = require('googleapis')

// ── Provider detection ──────────────────────────────────────────────────────
// Priority: SMTP (if explicitly configured) → Google (Gmail API, works on
// serverless/Vercel free tier since it's plain HTTPS, not a raw SMTP socket
// which most free hosts block) → dev-mode console fallback.
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
const GOOGLE_CONFIGURED = !!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REFRESH_TOKEN &&
  process.env.GOOGLE_SENDER_EMAIL
)

let smtpTransporter = null
if (SMTP_CONFIGURED) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

const getActiveProvider = () => (SMTP_CONFIGURED ? 'smtp' : GOOGLE_CONFIGURED ? 'gmail_api' : 'dev')

// ── Gmail API (OAuth2) sender ───────────────────────────────────────────────
// Uses a one-time-generated refresh token (see .env.example for setup steps)
// to send mail via the Gmail REST API — pure HTTPS, no SMTP ports involved.
function buildRawMimeMessage({ from, to, subject, html }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    html,
  ]
  const message = lines.join('\r\n')
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sendViaGmailApi(toEmail, subject, html) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const fromEmail = process.env.GOOGLE_SENDER_EMAIL
  const raw = buildRawMimeMessage({ from: `"Franchise Manager" <${fromEmail}>`, to: toEmail, subject, html })

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
}

// ── Templates ────────────────────────────────────────────────────────────────
const otpEmailHtml = (otp, name) => `
  <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
    <div style="background: #4f46e5; width: 40px; height: 40px; border-radius: 10px; margin-bottom: 20px;"></div>
    <h2 style="color: #111827; margin: 0 0 8px;">Reset your password</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Hi ${name || ''}, use the code below to reset your Franchise Manager password. This code expires in 10 minutes.
    </p>
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
    </div>
    <p style="color: #9ca3af; font-size: 12px;">
      If you didn't request this, you can safely ignore this email — your password will not be changed.
    </p>
  </div>
`

/**
 * Sends a password-reset OTP email through whichever provider is configured
 * (see getActiveProvider() priority above). Falls back to logging the OTP to
 * the console in local/dev environments with no email provider set up.
 */
async function sendOtpEmail(toEmail, otp, name) {
  const provider = getActiveProvider()
  const subject = 'Your password reset code'
  const html = otpEmailHtml(otp, name)

  if (provider === 'smtp') {
    await smtpTransporter.sendMail({
      from: process.env.SMTP_FROM || `"Franchise Manager" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html,
    })
    return { provider }
  }

  if (provider === 'gmail_api') {
    await sendViaGmailApi(toEmail, subject, html)
    return { provider }
  }

  console.log(`\n📧 [DEV MODE — no email provider configured] Password reset OTP for ${toEmail}: ${otp}\n`)
  return { provider }
}

module.exports = { sendOtpEmail, getActiveProvider }
