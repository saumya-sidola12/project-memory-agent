import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const BASE = "https://ai.gateway.lovable.dev/v1";
const CHAT_MODEL = "openai/gpt-6-astra";
const EMBED_MODEL = "google/gemini-embedding-2";

function key() {
  const k = process.env['LOVABLE_API_KEY'];
  if (!k) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  return k;
}

function provider() {
  const k = key();
  return createOpenAI({
    baseURL: BASE,
    apiKey: k,
    headers: { "Lovable-API-Key": k, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

function friendly(err: unknown): Error {
  const e = err as { statusCode?: number; status?: number; message?: string };
  const s = e?.statusCode ?? e?.status;
  if (s === 429) return new Error("AI is busy right now. Please wait a moment and try again.");
  if (s === 402) return new Error("AI credits are used up. Add credits in workspace billing to continue.");
  if (s === 403) return new Error(e.message || "AI access was denied for this request.");
  return new Error(e?.message || "AI request failed.");
}

export const memorySchema = z.object({
  memories: z.array(
    z.object({
      type: z.enum(["decision", "reason", "problem", "solution", "constraint"]),
      title: z.string(),
      content: z.string(),
      reason: z.string(),
      tags: z.array(z.string()),
      source_excerpt: z.string(),
    }),
  ),
});

export async function extractMemories(conversation: string) {
  try {
    const result = streamText({
      model: provider().responses(CHAT_MODEL),
      instructions:
        "You extract durable project memories from developer<->AI conversations. Return only meaningful items: decisions made, reasons, problems hit, solutions found, and constraints. Titles are short (under 10 words). Content is 1-2 sentences. reason may be empty. tags are 1-3 lowercase keywords. source_excerpt is a short verbatim quote. Return an empty list if nothing is worth remembering.",
      prompt: conversation,
      output: Output.object({ schema: memorySchema }),
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
    });
    const out = await result.output;
    return out.memories;
  } catch (err) {
    throw friendly(err);
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Embedding failed [${res.status}]: ${body}`);
    throw friendly({ status: res.status, message: `Search indexing failed (${res.status}).` });
  }
  const data = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function answerWithContext(
  question: string,
  context: { type: string; title: string; content: string; reason: string | null; created_at: string }[],
) {
  const ctx = context.length
    ? context
        .map(
          (m, i) =>
            `[${i + 1}] (${m.type}, ${m.created_at.slice(0, 10)}) ${m.title}: ${m.content}${m.reason ? ` Reason: ${m.reason}` : ""}`,
        )
        .join("\n")
    : "(no memories found)";
  try {
    const result = streamText({
      model: provider().responses(CHAT_MODEL),
      instructions:
        "You are a project memory assistant. Answer the developer's question using ONLY the numbered project memories provided. Cite memories like [1]. If the memories don't cover it, say so plainly. Be concise.",
      prompt: `Project memories:\n${ctx}\n\nQuestion: ${question}`,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
    });
    return await result.text;
  } catch (err) {
    throw friendly(err);
  }
}
