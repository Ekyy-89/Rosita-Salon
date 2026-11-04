// =====================================================================
// server/src/utils/mailer.js
// Kirim email lewat SMTP (default: Gmail + App Password).
// Kalau SMTP belum diisi: saat development isi email dicetak ke terminal
// supaya fitur tetap bisa dicoba; di production email tidak terkirim.
// =====================================================================
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

export const isMailConfigured = Boolean(SMTP_USER && SMTP_PASS);

const transporter = isMailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST || "smtp.gmail.com",
      port: Number(SMTP_PORT) || 465,
      secure: (Number(SMTP_PORT) || 465) === 465,
      // Gmail App Password ditampilkan dengan spasi, padahal yang valid tanpa spasi
      auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, "") },
      connectionTimeout: 10000,
    })
  : null;

/**
 * @param {{ to: string, subject: string, text: string, html: string }} mail
 */
export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      console.log(`\n📧 [SMTP belum diisi] Email untuk ${to}\n   Subjek: ${subject}\n${text}\n`);
      return;
    }
    throw new Error("SMTP_USER / SMTP_PASS belum diisi, email tidak bisa dikirim.");
  }

  await transporter.sendMail({
    from: MAIL_FROM || `Rosita Beauty Salon <${SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
