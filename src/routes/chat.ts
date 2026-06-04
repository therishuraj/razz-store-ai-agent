import { Router, Request, Response } from "express";
import { sendMessage, getConversationHistory } from "../services/chat";

const router = Router();

const MAX_MESSAGE_LENGTH = 1000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

router.post("/message", async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message cannot be empty." });
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
    });
    return;
  }

  const validSessionId = sessionId && isValidUUID(sessionId) ? sessionId : undefined;
  const result = await sendMessage(message.trim(), validSessionId);

  if (!result.success) {
    res.status(503).json({ error: result.reply });
    return;
  }

  res.json({ reply: result.reply, sessionId: result.sessionId });
});

router.get("/history/:sessionId", (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);

  if (!isValidUUID(sessionId)) {
    res.status(400).json({ error: "Invalid session ID format." });
    return;
  }

  const history = getConversationHistory(sessionId);

  if (!history) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  res.json(history);
});

export default router;
