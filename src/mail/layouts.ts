import type { SendMailInput } from "./schema.js";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderSignature(sig: NonNullable<SendMailInput["signature"]>): string {
  const lines = [
    `<strong>${esc(sig.name)}</strong>`,
    sig.title && esc(sig.title),
    sig.company && esc(sig.company),
    sig.email && `<a href="mailto:${esc(sig.email)}">${esc(sig.email)}</a>`,
    sig.phone && esc(sig.phone),
    sig.website && `<a href="${esc(sig.website)}">${esc(sig.website)}</a>`,
  ].filter(Boolean);
  return `<p style="margin:24px 0 0">${esc(sig.closing)}<br>${lines.join("<br>")}</p>`;
}

type Layout = (body: string, signature: string) => string;

const font = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222";

const layouts: Record<SendMailInput["layout"], Layout> = {
  minimal: (body, sig) => `<div style="${font}">${body}${sig}</div>`,

  default: (body, sig) => `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;${font}">
<tr><td style="padding:32px">${body}${sig}</td></tr>
</table></td></tr></table></body></html>`,

  card: (body, sig) => `<!doctype html><html><body style="margin:0;padding:0;background:#eef2f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;border-top:4px solid #2563eb;${font}">
<tr><td style="padding:32px">${body}${sig}</td></tr>
</table></td></tr></table></body></html>`,
};

export function renderMail(input: SendMailInput): string {
  const sig = input.signature ? renderSignature(input.signature) : "";
  return layouts[input.layout](input.html, sig);
}
