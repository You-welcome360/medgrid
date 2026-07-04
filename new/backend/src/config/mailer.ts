import nodemailer, { Transporter } from "nodemailer";
import { env } from "./env.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    // Email not configured — silent skip
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
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

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (err: any) {
    // Log but never throw — email failures must not break the request flow
    console.error("[Mailer] Failed to send email:", err.message);
  }
}
