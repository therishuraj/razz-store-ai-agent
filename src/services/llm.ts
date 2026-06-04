import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export interface LLMResult {
  success: boolean;
  text: string;
}

export async function generateReply(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<LLMResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: 500 },
    });

    const chatHistory = history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();

    if (!text) {
      return { success: false, text: "Sorry, I received an empty response. Please try again." };
    }

    return { success: true, text };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Gemini API error:", msg);

    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
      return { success: false, text: "The AI service API key is invalid. Please contact the site administrator." };
    }
    if (msg.includes("401")) {
      return { success: false, text: "The AI service could not authenticate. The API key may be expired or revoked." };
    }
    if (msg.includes("limit: 0")) {
      return { success: false, text: "The AI service has no quota allocated. The API key is not provisioned for free tier access." };
    }
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      return { success: false, text: "The AI service is temporarily rate-limited. Please wait a minute and try again." };
    }
    if (msg.includes("404") || msg.includes("not found")) {
      return { success: false, text: "The AI model could not be found. Please contact the site administrator." };
    }
    if (msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) {
      return { success: false, text: "The AI service took too long to respond. Please try again." };
    }
    if (msg.includes("503") || msg.includes("SERVICE_UNAVAILABLE")) {
      return { success: false, text: "The AI service is currently down. Please try again in a few minutes." };
    }

    return { success: false, text: "An unexpected error occurred with the AI service. Please try again." };
  }
}

