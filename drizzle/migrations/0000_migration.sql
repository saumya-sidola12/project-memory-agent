create extension if not exists vector;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  github_repo text,
  created_at timestamptz not null default now()
);
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null default 'decision',
  title text not null,
  content text not null,
  reason text,
  tags text[] not null default '{}',
  source_excerpt text,
  embedding vector(3072),
  created_at timestamptz not null default now()
);
create table public.commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  sha text not null,
  message text not null,
  author text,
  url text not null,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (memory_id, sha)
);
create index on public.memories(project_id, created_at desc);

grant select, insert, update, delete on public.projects, public.memories, public.commits to anon, authenticated;
grant all on public.projects, public.memories, public.commits to service_role;
alter table public.projects enable row level security;
alter table public.memories enable row level security;
alter table public.commits enable row level security;
create policy "open demo access" on public.projects for all to anon, authenticated using (true) with check (true);
create policy "open demo access" on public.memories for all to anon, authenticated using (true) with check (true);
create policy "open demo access" on public.commits for all to anon, authenticated using (true) with check (true);

create or replace function public.match_memories(p_project uuid, query_embedding vector(3072), match_count int default 6)
returns table (id uuid, type text, title text, content text, reason text, created_at timestamptz, similarity float)
language sql stable set search_path = public as $$
  select m.id, m.type, m.title, m.content, m.reason, m.created_at, 1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.project_id = p_project and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function public.match_memories to anon, authenticated;

insert into public.projects (id, name, description, github_repo) values
('11111111-1111-1111-1111-111111111111', 'Memory Assistant', 'Final year project: AI that remembers why we built things the way we did.', 'vercel/next.js');
insert into public.memories (project_id, type, title, content, reason, tags, created_at) values
('11111111-1111-1111-1111-111111111111','decision','Use vector search inside the main database','Store embeddings next to memories instead of a separate vector DB.','Keeps the stack free-tier friendly and avoids syncing two stores.','{database,rag}', now() - interval '9 days'),
('11111111-1111-1111-1111-111111111111','constraint','Must stay on free tiers','Every service must run on a free plan for the project demo.','Student budget.','{cost}', now() - interval '8 days'),
('11111111-1111-1111-1111-111111111111','problem','Extraction returned inconsistent JSON','The model sometimes wrapped JSON in prose.','','{llm}', now() - interval '5 days'),
('11111111-1111-1111-1111-111111111111','solution','Enforce a strict output schema','Switched extraction to schema-constrained output, eliminating parse errors.','Reliable parsing.','{llm}', now() - interval '4 days');