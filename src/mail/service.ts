import nodemailer from "nodemailer";
import { config } from "../config.js";
import { renderMail } from "./layouts.js";
import type { SendMailInput } from "./schema.js";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

const fmt = (a: SendMailInput["to"][number]) =>
  typeof a === "string" ? a : { name: a.name ?? "", address: a.email };

export async function sendMail(input: SendMailInput) {
  const from = input.from ?? config.defaultFrom;
  if (!from) throw new Error("No `from` in request and DEFAULT_FROM is not configured");

  const message = {
    from: typeof from === "string" ? from : fmt(from),
    replyTo: input.replyTo ? (typeof input.replyTo === "string" ? input.replyTo : fmt(input.replyTo)) : config.defaultReplyTo,
    to: input.to.map(fmt),
    cc: input.cc.map(fmt),
    bcc: input.bcc.map(fmt),
    subject: input.subject,
    html: renderMail(input),
    attachments: input.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType,
    })),
  };

  if (config.dryRun) return { messageId: null, dryRun: true, html: message.html };

  const info = await transporter.sendMail(message);
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}
