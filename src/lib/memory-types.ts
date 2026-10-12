import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MEMORY_TYPES = ["decision", "reason", "problem", "solution", "constraint"] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const typeStyles: Record<string, string> = {
  decision: "bg-mem-decision/15 text-mem-decision border-mem-decision/30",
  reason: "bg-mem-reason/15 text-mem-reason border-mem-reason/30",
  problem: "bg-mem-problem/15 text-mem-problem border-mem-problem/30",
  solution: "bg-mem-solution/15 text-mem-solution border-mem-solution/30",
  constraint: "bg-mem-constraint/15 text-mem-constraint border-mem-constraint/30",
};
export const typeDot: Record<string, string> = {
  decision: "bg-mem-decision",
  reason: "bg-mem-reason",
  problem: "bg-mem-problem",
  solution: "bg-mem-solution",
  constraint: "bg-mem-constraint",
};
export const typeColorVar: Record<string, string> = {
  decision: "var(--mem-decision)",
  reason: "var(--mem-reason)",
  problem: "var(--mem-problem)",
  solution: "var(--mem-solution)",
  constraint: "var(--mem-constraint)",
};

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id,name,description,github_repo,created_at,memories(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const memoriesQuery = (id: string) =>
  queryOptions({
    queryKey: ["memories", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("id,type,title,content,reason,tags,source_excerpt,created_at,commits(id,sha,message,url)")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
