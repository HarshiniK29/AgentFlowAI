import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;
if (config.smtpHost && config.smtpUser && config.smtpPass) {
  transporter = nodemailer.createTransport({
    host: config.smtpHost, port: config.smtpPort, secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass }
  });
}
export async function sendMail({to, subject, html}) {
  if (!transporter) {
    console.warn(`[MAIL DEV] to=${to} subject=${subject}`);
    return { dev: true };
  }
  return transporter.sendMail({ from: config.mailFrom, to, subject, html });
}
