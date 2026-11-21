import "dotenv/config";

export const config = {
  // Comma-separated list; one key per calling service so they can be rotated independently.
  apiKeys: (process.env.API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean),
  // "userId:password" pairs, comma-separated. Callers authenticate with HTTP Basic auth.
  users: (process.env.USERS ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.includes(":"))
    .map((u) => ({ id: u.slice(0, u.indexOf(":")), password: u.slice(u.indexOf(":") + 1) })),
  port: Number(process.env.PORT) || 3000,
  smtp: {
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Used when a request omits `from`.
  defaultFrom: process.env.DEFAULT_FROM,
  // Used when a request omits `replyTo`.
  defaultReplyTo: process.env.REPLY_TO,
  // Set to "true" to log the composed message instead of sending (no SMTP needed).
  dryRun: process.env.MAIL_DRY_RUN === "true",
};
