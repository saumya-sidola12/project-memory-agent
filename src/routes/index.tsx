import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Brain, Plus, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { projectsQuery } from "@/lib/memory-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recall — AI Project Memory Assistant" },
      { name: "description", content: "Turn developer–AI conversations into searchable project memories: decisions, problems, solutions and constraints." },
      { property: "og:title", content: "Recall — AI Project Memory Assistant" },
      { property: "og:description", content: "Your project's long-term memory, built from AI conversations." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  component: Index,
});

function Index() {
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [repo, setRepo] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), description: desc.trim(), github_repo: repo.trim() || null });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName(""); setDesc(""); setRepo("");
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Project created");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground">
          <Brain className="h-3.5 w-3.5 text-primary" /> recall / project memory
        </div>
        <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
          Never forget <span className="text-primary">why</span> you built it.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Paste your conversations with AI. Recall extracts the decisions, problems, solutions and
          constraints — then answers questions about your project later.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Projects</h2>
          <div className="grid gap-3">
            {projects.length === 0 && <p className="text-muted-foreground">No projects yet.</p>}
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="group rounded-xl border border-border bg-card/70 p-5 transition hover:border-primary/50 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-primary">{p.name}</h3>
                    {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                  </div>
                  <span className="shrink-0 font-mono text-sm text-primary">
                    {(p.memories as unknown as { count: number }[])[0]?.count ?? 0} mem
                  </span>
                </div>
                {p.github_repo && (
                  <p className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <GitBranch className="h-3 w-3" /> {p.github_repo}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>

        <form onSubmit={create} className="h-fit space-y-3 rounded-xl border border-border bg-card/70 p-5">
          <h2 className="font-semibold">New project</h2>
          <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Short description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          <Input placeholder="GitHub repo (owner/repo, optional)" value={repo} onChange={(e) => setRepo(e.target.value)} className="font-mono text-sm" />
          <Button type="submit" disabled={busy || !name.trim()} className="w-full">
            <Plus className="h-4 w-4" /> Create
          </Button>
        </form>
      </div>
    </main>
  );
}
