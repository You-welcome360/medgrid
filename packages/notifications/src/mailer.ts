import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!host || !user || !pass) {
    // Email not configured — silent skip
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const transport = getTransporter();
  if (!transport) return; // silently skip if SMTP not configured

  const from = process.env.EMAIL_FROM || 'Medgrid <noreply@medgrid.app>';

  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (err: any) {
    // Log but never throw — email failures must not break the request flow
    console.error('[Mailer] Failed to send email:', err.message);
  }
}
