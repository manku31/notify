import express from "express";
import { config } from "./config.js";
import { requireApiKey } from "./middleware/apiKey.js";
import { mailRouter } from "./routes/mail.js";

const app = express();

// Attachments arrive base64-encoded in the JSON body, so allow a larger payload.
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

if (config.apiKeys.length === 0 && config.users.length === 0) {
  // Fail closed: never run an open mail relay.
  console.error("Neither API_KEYS nor USERS is set; refusing to start.");
  process.exit(1);
}
app.use("/api", requireApiKey);
app.use("/api/v1/mail", mailRouter);

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
