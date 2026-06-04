import { randomUUID } from "crypto";
import db from "../db/database";
import { generateReply, ChatMessage } from "./llm";

export interface SendMessageResult {
  success: boolean;
  reply: string;
  sessionId: string;
}

function buildSystemPrompt(): string {
  const rows = db
    .prepare("SELECT topic, content FROM knowledge_base ORDER BY topic")
    .all() as { topic: string; content: string }[];

  const knowledge = rows.map((r) => `[${r.topic.toUpperCase()}]\n${r.content}`).join("\n\n");

  return `You are a friendly and helpful customer support agent for Razz's Store, an online electronics and gadgets shop.

Use the store knowledge below to answer customer questions accurately and concisely.
If a question is not covered by the knowledge below, say you don't have that information and suggest the customer email support@razzstore.com.
Do not make up information. Keep answers short and friendly.

STORE KNOWLEDGE:
${knowledge}`;
}

function getOrCreateConversation(sessionId: string | undefined): string {
  if (sessionId) {
    const existing = db
      .prepare("SELECT id FROM conversations WHERE id = ?")
      .get(sessionId) as { id: string } | undefined;
    if (existing) return existing.id;
  }
  const newId = randomUUID();
  db.prepare("INSERT INTO conversations (id) VALUES (?)").run(newId);
  return newId;
}

function getHistory(conversationId: string): ChatMessage[] {
  const rows = db
    .prepare("SELECT sender, text FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC")
    .all(conversationId) as { sender: "user" | "ai"; text: string }[];
  return rows.map((r) => ({ sender: r.sender, text: r.text }));
}

export async function sendMessage(
  userMessage: string,
  sessionId: string | undefined
): Promise<SendMessageResult> {
  const conversationId = getOrCreateConversation(sessionId);
  const history = getHistory(conversationId);
  const systemPrompt = buildSystemPrompt();

  const result = await generateReply(systemPrompt, history, userMessage);

  // Only persist to DB if the LLM responded successfully
  if (result.success) {
    db.prepare("INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)").run(
      conversationId, "user", userMessage
    );
    db.prepare("INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)").run(
      conversationId, "ai", result.text
    );
  }

  return { success: result.success, reply: result.text, sessionId: conversationId };
}

export function getConversationHistory(sessionId: string) {
  const conversation = db
    .prepare("SELECT id, created_at FROM conversations WHERE id = ?")
    .get(sessionId) as { id: string; created_at: string } | undefined;

  if (!conversation) return null;

  const messages = db
    .prepare(
      "SELECT sender, text, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC"
    )
    .all(sessionId) as { sender: string; text: string; timestamp: string }[];

  return { sessionId: conversation.id, createdAt: conversation.created_at, messages };
}
