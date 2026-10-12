import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function db() {
  return createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, {
    auth: { persistSession: false },
  });
}

const vec = (v: number[] | undefined) => {
  if (!v) throw new Error("Missing search vector");
  return `[${v.join(",")}]`;
};


export const ingestConversation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.guid(), conversation: z.string().min(20).max(60000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { extractMemories, embed } = await import("./ai.server");
    const items = await extractMemories(data.conversation);
    if (!items.length) return { count: 0 };
    const vectors = await embed(items.map((m) => `${m.type}: ${m.title}. ${m.content} ${m.reason}`));
    const rows = items.map((m, i) => ({
      project_id: data.projectId,
      type: m.type,
      title: m.title,
      content: m.content,
      reason: m.reason || null,
      tags: m.tags,
      source_excerpt: m.source_excerpt || null,
      embedding: vec(vectors[i]),
    }));
    const { error } = await db().from("memories").insert(rows);
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

export const askMemory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.guid(), question: z.string().min(2).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { embed, answerWithContext } = await import("./ai.server");
    const client = db();
    // Index any memories that don't have a search vector yet (e.g. added manually).
    const { data: missing } = await client
      .from("memories")
      .select("id,type,title,content,reason")
      .eq("project_id", data.projectId)
      .is("embedding", null)
      .limit(50);
    if (missing?.length) {
      const vs = await embed(missing.map((m) => `${m.type}: ${m.title}. ${m.content} ${m.reason ?? ""}`));
      await Promise.all(
        missing.map((m, i) => client.from("memories").update({ embedding: vec(vs[i]) }).eq("id", m.id)),
      );
    }
    const [q] = await embed([data.question]);
    const { data: matches, error } = await client.rpc("match_memories", {
      p_project: data.projectId,
      query_embedding: vec(q),
      match_count: 6,
    });
    if (error) throw new Error(error.message);
    const answer = await answerWithContext(data.question, matches ?? []);
    return { answer, sources: matches ?? [] };
  });

export const fetchRepoCommits = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const raw = z.object({ repo: z.string() }).parse(d).repo;
    const repo = normalizeRepo(raw);
    if (!repo) throw new Error("Enter a GitHub repo like owner/repo or paste its github.com link.");
    return { repo };
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.github.com/repos/${data.repo}/commits?per_page=20`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "project-memory-assistant" },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub request failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const list = (await res.json()) as {
      sha: string;
      html_url: string;
      commit: { message: string; author: { name: string; date: string } | null };
    }[];
    return list.map((c) => ({
      sha: c.sha,
      url: c.html_url,
      message: c.commit.message.split("\n")[0] ?? "",
      author: c.commit.author?.name ?? null,
      committed_at: c.commit.author?.date ?? null,
    }));
  });

export function normalizeRepo(input: string): string | null {
  const s = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/[?#].*$/, "");
  const m = s.match(/^([\w.-]+)\/([\w.-]+)/);
  return m ? `${m[1]}/${m[2]}` : null;
}
