import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkle, MessageSquareText, GitCommitHorizontal, Trash2, Loader2, Send, Link2 } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { memoriesQuery, projectQuery, typeStyles, typeDot, typeColorVar, MEMORY_TYPES } from "@/lib/memory-types";
import { ingestConversation, askMemory, fetchRepoCommits } from "@/lib/memory.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/projects/$id")({
  loader: async ({ context, params }) => {
    const project = await context.queryClient.ensureQueryData(projectQuery(params.id));
    if (!project) throw notFound();
    await context.queryClient.ensureQueryData(memoriesQuery(params.id));
    return { name: project.name, description: project.description };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.name} — Recall` : "Project — Recall";
    const d = loaderData?.description || "Project memories, timeline and AI answers.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-16 text-center">
      Project not found. <Link to="/" className="text-primary underline">Back</Link>
    </div>
  ),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQuery(id));
  if (!project) return null;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>
      <h1 className="text-4xl font-semibold tracking-tight">{project.name}</h1>
      {project.description && <p className="mt-2 text-muted-foreground">{project.description}</p>}
      <Tabs defaultValue="timeline" className="mt-8">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="ingest">Add conversation</TabsTrigger>
          <TabsTrigger value="ask">Ask memory</TabsTrigger>
          <TabsTrigger value="git">GitHub</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-6"><Timeline projectId={id} /></TabsContent>
        <TabsContent value="ingest" className="mt-6"><Ingest projectId={id} /></TabsContent>
        <TabsContent value="ask" className="mt-6"><Ask projectId={id} /></TabsContent>
        <TabsContent value="git" className="mt-6"><Git projectId={id} repo={project.github_repo} /></TabsContent>
      </Tabs>
    </main>
  );
}

function TypeBadge({ type }: { type: string }) {
  return <Badge variant="outline" className={`font-mono text-[11px] uppercase ${typeStyles[type] ?? ""}`}>{type}</Badge>;
}

function Timeline({ projectId }: { projectId: string }) {
  const { data: memories } = useSuspenseQuery(memoriesQuery(projectId));
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const byType = useMemo(
    () => MEMORY_TYPES.map((t) => ({ name: t, value: memories.filter((m) => m.type === t).length })).filter((d) => d.value),
    [memories],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    [...memories].reverse().forEach((m) => {
      const d = m.created_at.slice(5, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return [...map].map(([day, count]) => ({ day, count }));
  }, [memories]);

  const shown = filter === "all" ? memories : memories.filter((m) => m.type === filter);

  async function remove(mid: string) {
    const { error } = await supabase.from("memories").delete().eq("id", mid);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["memories", projectId] });
  }

  if (!memories.length)
    return <p className="text-muted-foreground">No memories yet — add a conversation to get started.</p>;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/70 p-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">Total memories</p>
          <p className="mt-2 text-5xl font-semibold text-primary">{memories.length}</p>
          <div className="mt-4 space-y-1">
            {byType.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize"><span className={`h-2 w-2 rounded-full ${typeDot[t.name]}`} />{t.name}</span>
                <span className="font-mono">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">By type</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={byType} dataKey="value" innerRadius={45} outerRadius={75} stroke="none">
                {byType.map((d) => <Cell key={d.name} fill={typeColorVar[d.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">Activity</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDay}>
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} width={24} />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...MEMORY_TYPES].map((t) => (
          <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)} className="capitalize">
            {t}
          </Button>
        ))}
      </div>

      <ol className="relative space-y-4 border-l border-border pl-6">
        {shown.map((m) => (
          <li key={m.id} className="relative">
            <span className={`absolute -left-[31px] top-5 h-3 w-3 rounded-full ring-4 ring-background ${typeDot[m.type]}`} />
            <div className="group rounded-xl border border-border bg-card/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={m.type} />
                  <span className="font-mono text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <button onClick={() => remove(m.id)} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive" aria-label="Delete memory">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-2 font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.content}</p>
              {m.reason && <p className="mt-2 text-sm"><span className="text-primary">Why:</span> {m.reason}</p>}
              {m.source_excerpt && <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 font-mono text-xs text-muted-foreground">“{m.source_excerpt}”</blockquote>}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.tags.map((t) => <span key={t} className="font-mono text-xs text-muted-foreground">#{t}</span>)}
                {m.commits.map((c) => (
                  <a key={c.id} href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs text-primary hover:underline">
                    <GitCommitHorizontal className="h-3 w-3" />{c.sha.slice(0, 7)}
                  </a>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SAMPLE = `Me: Should we use a separate vector database like Pinecone for the memories?
AI: Since you're on a free tier, storing embeddings in Postgres with pgvector avoids another service and keeps data in one place.
Me: OK, let's do that. Also, login with JWT was taking too long to build.
AI: You could use a managed auth service instead of rolling JWT yourself.
Me: Decided — managed auth. The demo deadline is in 3 weeks so we can't build custom auth.`;

function Ingest({ projectId }: { projectId: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  async function run() {
    setBusy(true);
    try {
      const r = await ingestConversation({ data: { projectId, conversation: text } });
      toast.success(r.count ? `Saved ${r.count} memories` : "Nothing worth remembering found");
      if (r.count) setText("");
      qc.invalidateQueries({ queryKey: ["memories", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-muted-foreground">Paste a conversation between you and an AI assistant. Recall will extract the important bits.</p>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder="Me: ...&#10;AI: ..." className="font-mono text-sm" />
      <div className="flex gap-2">
        <Button onClick={run} disabled={busy || text.trim().length < 20}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />} Extract memories
        </Button>
        <Button variant="outline" onClick={() => setText(SAMPLE)} disabled={busy}>Use sample</Button>
      </div>
    </div>
  );
}

type Turn = { q: string; a?: string; sources?: { id: string; title: string; type: string; similarity: number }[]; error?: string };

function Ask({ projectId }: { projectId: string }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question) return;
    setQ("");
    setBusy(true);
    setTurns((t) => [...t, { q: question }]);
    try {
      const r = await askMemory({ data: { projectId, question } });
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a: r.answer, sources: r.sources } : x)));
    } catch (err) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: (err as Error).message } : x)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-3xl">
      <div className="space-y-6">
        {turns.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <MessageSquareText className="mx-auto mb-3 h-6 w-6 text-primary" />
            Ask things like “Why did we choose this database?” or “What problems did we hit?”
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <div className="ml-auto w-fit max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">{t.q}</div>
            {t.error ? (
              <p className="text-sm text-destructive">{t.error}</p>
            ) : t.a ? (
              <div>
                <p className="whitespace-pre-wrap leading-relaxed">{t.a}</p>
                {!!t.sources?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.sources.map((s, n) => (
                      <span key={s.id} className={`rounded border px-2 py-0.5 font-mono text-xs ${typeStyles[s.type] ?? ""}`}>
                        [{n + 1}] {s.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching memories…</p>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-6 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask your project memory…" />
        <Button type="submit" disabled={busy || !q.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

type Commit = Awaited<ReturnType<typeof fetchRepoCommits>>[number];

function Git({ projectId, repo }: { projectId: string; repo: string | null }) {
  const qc = useQueryClient();
  const { data: memories } = useSuspenseQuery(memoriesQuery(projectId));
  const [repoInput, setRepoInput] = useState(repo ?? "");
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<Record<string, string>>({});

  async function load() {
    setBusy(true);
    try {
      if (repoInput !== repo) {
        await supabase.from("projects").update({ github_repo: repoInput || null }).eq("id", projectId);
        qc.invalidateQueries({ queryKey: ["project", projectId] });
      }
      setCommits(await fetchRepoCommits({ data: { repo: repoInput.trim() } }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function link(c: Commit) {
    const memory_id = choice[c.sha];
    if (!memory_id) {
      toast.error("Pick a memory first");
      return;
    }
    const { error } = await supabase.from("commits").upsert(
      { project_id: projectId, memory_id, sha: c.sha, message: c.message, author: c.author, url: c.url, committed_at: c.committed_at },
      { onConflict: "memory_id,sha" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Commit linked");
    qc.invalidateQueries({ queryKey: ["memories", projectId] });
  }

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-muted-foreground">Load recent commits from a public GitHub repository and link them to the memory that explains them.</p>
      <div className="flex gap-2">
        <Input value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="owner/repo" className="font-mono" />
        <Button onClick={load} disabled={busy || !repoInput.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCommitHorizontal className="h-4 w-4" />} Load commits
        </Button>
      </div>
      {commits && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card/70">
          {commits.map((c) => (
            <li key={c.sha} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <a href={c.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">{c.sha.slice(0, 7)}</a>
                <p className="truncate text-sm">{c.message}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.author} · {c.committed_at?.slice(0, 10)}</p>
              </div>
              <div className="flex gap-2">
                <Select value={choice[c.sha] ?? ""} onValueChange={(v) => setChoice((s) => ({ ...s, [c.sha]: v }))}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Link to memory…" /></SelectTrigger>
                  <SelectContent>
                    {memories.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => link(c)} aria-label="Link commit"><Link2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
