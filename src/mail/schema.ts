import { z } from "zod";

const address = z.union([
  z.email(),
  z.object({ name: z.string().optional(), email: z.email() }),
]);
// null / missing / "" are treated as "not provided".
const blank = (v: unknown) => (v === null || v === "" ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blank, schema.optional());

// Optional list: accepts missing, null, a single address, or an array.
const addressList = z.preprocess(
  (v) => (blank(v) === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(address),
);

export const layoutNames = ["default", "minimal", "card"] as const;

export const sendMailSchema = z
  .object({
    from: optional(address),
    replyTo: optional(address),
    to: z.array(address).min(1),
    cc: addressList,
    bcc: addressList,
    subject: z.string().min(1).max(998),
    /** How the mail looks: which layout wraps the body. */
    layout: z.preprocess(blank, z.enum(layoutNames).default("default")),
    /** Body as an HTML string. */
    html: z.string().min(1),
    attachments: z.preprocess(
      (v) => blank(v) ?? [],
      z
        .array(
        z.object({
          filename: z.string().min(1),
          /** Base64-encoded file content. */
          content: z.string().min(1),
          contentType: z.string().optional(),
        }),
      )
        .max(10),
    ),
    /** Sign-off rendered at the bottom of the mail. */
    signature: optional(
      z.object({
        name: z.string().min(1),
        title: z.string().optional(),
        company: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        website: z.url().optional(),
        closing: z.string().default("Regards,"),
      }),
    ),
  })
  .strict();

export type SendMailInput = z.infer<typeof sendMailSchema>;
