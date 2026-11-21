import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";

// Hash so comparison is constant-time and length-independent.
const digest = (s: string) => createHash("sha256").update(s).digest();
const allowedKeys = config.apiKeys.map(digest);
const allowedUsers = config.users.map((u) => ({ id: digest(u.id), password: digest(u.password) }));

const eq = (a: Buffer, b: Buffer) => timingSafeEqual(a, b);

function validKey(key: string | undefined): boolean {
  if (key === undefined) return false;
  // Check every key (no early exit) to avoid leaking which one matched.
  return allowedKeys.map((a) => eq(a, digest(key))).includes(true);
}

function validBasic(encoded: string): boolean {
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const id = digest(decoded.slice(0, i));
  const password = digest(decoded.slice(i + 1));
  return allowedUsers.map((u) => eq(u.id, id) && eq(u.password, password)).includes(true);
}

export const requireApiKey: RequestHandler = (req, res, next) => {
  const auth = req.header("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
  const basic = auth?.match(/^Basic\s+(.+)$/i)?.[1];

  const ok = validKey(req.header("x-api-key") ?? bearer) || (basic !== undefined && validBasic(basic));
  if (!ok) {
    res
      .status(401)
      .set("WWW-Authenticate", 'Basic realm="notify"')
      .json({ error: "unauthorized", message: "Missing or invalid credentials" });
    return;
  }
  next();
};
