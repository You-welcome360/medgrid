import "dotenv/config";

const required = (key: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  PORT: Number(process.env.PORT) || 3000,

  JWT_SECRET: required("JWT_SECRET", process.env.JWT_SECRET),
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN as "1d" | "7d" | "30d") || "1d",

  DATABASE_URL: required("DATABASE_URL", process.env.DATABASE_URL),
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || "dummy_paystack_secret_key",

  // Email (Nodemailer) — optional; if not set, email sending is skipped silently
  SMTP_HOST:     process.env.SMTP_HOST     || "",
  SMTP_PORT:     Number(process.env.SMTP_PORT) || 587,
  SMTP_USER:     process.env.SMTP_USER     || "",
  SMTP_PASS:     process.env.SMTP_PASS     || "",
  EMAIL_FROM:    process.env.EMAIL_FROM    || "Medgrid <noreply@medgrid.app>",

  // Balance low alert threshold (default 100)
  BALANCE_LOW_THRESHOLD: Number(process.env.BALANCE_LOW_THRESHOLD) || 100,
};
