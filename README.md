# Notify

A small HTTP service for sending emails. Callers authenticate with a userId and password, post a JSON payload, and Notify composes an HTML email (with a layout and optional signature) and sends it over SMTP. It is set up for [Resend](https://resend.com) but works with any SMTP provider.

## Features

- `POST /api/v1/mail/send` endpoint with request validation (zod)
- HTTP Basic auth (userId + password), plus optional API keys
- Three layouts: `default`, `minimal`, `card`
- Optional signature block, CC/BCC, Reply-To, base64 attachments
- Dry-run mode: compose the email without sending

## Requirements

- Node.js 20+
- A Resend account (or any SMTP provider)

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values (see Configuration)
npm run dev               # http://localhost:3000
```

Scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |

> `.env` is only read at startup. Restart the server after editing it.

## Configuration

All settings live in `.env`.

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default `3000`) |
| `USERS` | Login credentials, `userId:password` pairs separated by commas, e.g. `alice:s3cret,bob:pa55`. Passwords cannot contain a comma |
| `API_KEYS` | Optional comma-separated API keys (sent as `x-api-key`). Leave empty to allow only `USERS` logins. Generate one with `openssl rand -hex 32` |
| `SMTP_HOST` | SMTP server (`smtp.resend.com`) |
| `SMTP_PORT` | SMTP port (`587`) |
| `SMTP_SECURE` | `false` for port 587 (STARTTLS), `true` for port 465 |
| `SMTP_USER` | SMTP username (`resend` for Resend) |
| `SMTP_PASS` | SMTP password (your Resend API key) |
| `DEFAULT_FROM` | Sender used when a request has no `from`, e.g. `"Notify <onboarding@resend.dev>"` |
| `REPLY_TO` | Optional default Reply-To address |
| `MAIL_DRY_RUN` | `true` returns the composed HTML without sending |

The server refuses to start if both `USERS` and `API_KEYS` are empty, so it can never run as an open mail relay.

### Resend setup

1. Create an API key at resend.com → API Keys and put it in `SMTP_PASS`.
2. **Testing without a domain:** set `DEFAULT_FROM="Notify <onboarding@resend.dev>"`. Resend only delivers these to the email address on your Resend account; anything else fails with a `502`.
3. **Production:** add and verify your own domain at resend.com → Domains (add the MX, SPF and DKIM records it shows you). Then use an address on it, e.g. `DEFAULT_FROM="Notify <no-reply@yourdomain.com>"`.

## Authentication

Every `/api/*` request needs one of:

- **HTTP Basic auth** with a `userId` and `password` from `USERS` (recommended)
- An API key in the `x-api-key` header, or `Authorization: Bearer <key>`, if `API_KEYS` is set

Missing or invalid credentials return `401`. Use HTTPS in production, because Basic auth sends the password with every request.

## API

### `GET /health`

No authentication. Returns `{ "status": "ok" }`.

### `POST /api/v1/mail/send`

```bash
curl --location 'http://localhost:3000/api/v1/mail/send' \
--user 'USER_ID:PASSWORD' \
--header 'Content-Type: application/json' \
--data-raw '{
  "to": ["recipient@example.com"],
  "subject": "Test from Notify",
  "layout": "card",
  "html": "<p>Hello! This is a test email.</p>",
  "signature": {
    "name": "Your Name",
    "title": "Developer",
    "closing": "Regards,"
  }
}'
```

In Postman, import the curl (Import → Raw text), then check that the **Authorization** tab is set to **Basic Auth**.

#### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `to` | array of address | yes | At least one recipient |
| `subject` | string | yes | 1–998 characters |
| `html` | string | yes | Email body as HTML |
| `from` | address | no | Defaults to `DEFAULT_FROM` |
| `replyTo` | address | no | Defaults to `REPLY_TO` |
| `cc`, `bcc` | address or array | no | |
| `layout` | `default` \| `minimal` \| `card` | no | Default `default` |
| `signature` | object | no | See below |
| `attachments` | array (max 10) | no | `{ filename, content, contentType? }`, `content` is base64 |

An **address** is either a string (`"a@example.com"`) or an object (`{ "name": "Alice", "email": "a@example.com" }`).

**Signature** fields: `name` (required), `title`, `company`, `email`, `phone`, `website`, `closing` (default `"Regards,"`).

Unknown fields are rejected with `400`. Request bodies up to 25 MB are accepted, to allow attachments.

#### Responses

| Status | Meaning |
|---|---|
| `202` | Accepted by the SMTP provider. Body: `{ "messageId", "accepted", "rejected" }` |
| `400` | Validation failed. Body: `{ "error": "validation_failed", "details": ... }` |
| `401` | Missing or invalid credentials |
| `502` | The SMTP provider rejected the message. Body: `{ "error": "send_failed", "message": ... }` |

In dry-run mode the `202` body is `{ "messageId": null, "dryRun": true, "html": "..." }`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `401` in Postman but curl works | Authorization tab is not set to Basic Auth, or a stale `x-api-key` header is present |
| `401` after editing `.env` | Server was not restarted |
| `502` "You can only send testing emails to your own email address" | Using `onboarding@resend.dev` without a verified domain. Send only to your Resend account email |
| `502` authentication failed | Wrong `SMTP_PASS` (Resend API key) or `SMTP_USER` |
| Sender shows a Gmail address | `SMTP_*` still points at Gmail, which overrides `From` |

## Project structure

```
src/
  server.ts            Express app, auth wiring, startup checks
  config.ts            Reads .env
  middleware/apiKey.ts Basic auth and API key check
  routes/mail.ts       POST /api/v1/mail/send
  mail/schema.ts       Request validation
  mail/layouts.ts      HTML layouts and signature rendering
  mail/service.ts      Composes and sends the message (nodemailer)
```

## Security notes

- Keep `.env` out of version control. It holds your SMTP key and user passwords.
- `USERS` passwords are stored as plain text in `.env`. This suits a handful of trusted users, not public signup.
- All users send through one shared SMTP account. There is no per-user rate limiting.
