import { Router } from "express";
import { z } from "zod";
import { sendMailSchema } from "../mail/schema.js";
import { sendMail } from "../mail/service.js";

export const mailRouter = Router();

mailRouter.post("/send", async (req, res) => {
  const parsed = sendMailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_failed", details: z.treeifyError(parsed.error) });
    return;
  }
  try {
    res.status(202).json(await sendMail(parsed.data));
  } catch (err) {
    console.error("send failed", err);
    res.status(502).json({ error: "send_failed", message: (err as Error).message });
  }
});
