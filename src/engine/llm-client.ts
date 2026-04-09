/**
 * OpenAI-compatible LLM client (for DeepSeek or similar providers).
 */

import { getValue } from "../database/implementations/index.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmSettings {
  apiBaseUrl: string;
  apiModel: string;
  apiKey: string;
}

export interface ChatCompletionChoice {
  message?: { content?: string | null };
}

export interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

export interface FetchFn {
  input: string;
  init?: unknown;
}

interface ClientOptions {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  settings?: LlmSettings;
}

export class LlmRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmRequestError";
    this.status = status;
  }
}

export function parseTagsFromContent(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const normalized = trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .replace(/[，、]/g, ",")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'")
      .trim();
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag) => typeof tag === "string");
    }
  } catch {
    // fall back to parsing lines
  }

  return trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/[，、]/g, ",")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .split(/[\n,]/g)
    .map((tag) => tag.trim())
    .map((tag) => tag.replace(/^["'“”‘’]+|["'“”‘’]+$/g, ""))
    .filter((tag) => tag.length > 0);
}

export function buildChatRequestBody(
  model: string,
  messages: ChatMessage[]
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: 0.2
  };
}

async function loadSettings(): Promise<LlmSettings> {
  const saved = (await getValue<LlmSettings>("settings")) ?? {
    apiBaseUrl: "https://api.openai.com",
    apiModel: "gpt-4o-mini",
    apiKey: ""
  };
  return saved;
}

export async function chatComplete(
  messages: ChatMessage[],
  options: ClientOptions = {}
): Promise<string | null> {
  const settings = options.settings ?? (await loadSettings());
  const fetchFn = options.fetchFn ?? fetch;

  if (!settings.apiKey) {
    console.warn("[LLM] Missing apiKey");
    throw new LlmRequestError("Missing apiKey");
  }

  const url = `${settings.apiBaseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const body = buildChatRequestBody(settings.apiModel, messages);

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error("[LLM] Request failed", response);
      throw new LlmRequestError(`Request failed with status ${response.status}`, response.status);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch (error) {
    if (error instanceof LlmRequestError) {
      throw error;
    }
    console.error("[LLM] Request error", error);
    throw new LlmRequestError("Request error");
  }
}

/**
 * 检查LLM是否已配置
 */
export async function isLlmConfigured(): Promise<boolean> {
  try {
    const settings = await loadSettings();
    return !!settings.apiKey && !!settings.apiBaseUrl && !!settings.apiModel;
  } catch (error) {
    console.error("[LLM] Failed to check configuration:", error);
    return false;
  }
}
