-- 자료 간 관계. cites: 출발 자료가 대상 자료를 인용함, related: 방향 없는 관련 관계
create table public.material_relations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  source_id uuid not null references public.materials (id) on delete cascade,
  target_id uuid not null references public.materials (id) on delete cascade,
  relation text not null check (relation in ('cites', 'related')),
  created_at timestamptz not null default now(),
  check (source_id <> target_id),
  unique (source_id, target_id, relation)
);

create index material_relations_owner_id_idx on public.material_relations (owner_id);
create index material_relations_target_id_idx on public.material_relations (target_id);

-- related는 방향이 없으므로 A-B와 B-A를 같은 관계로 본다
create unique index material_relations_related_unique
  on public.material_relations (least(source_id, target_id), greatest(source_id, target_id))
  where relation = 'related';

alter table public.material_relations enable row level security;

create policy "relations: read own" on public.material_relations
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- 양쪽 자료가 모두 내 것일 때만 연결할 수 있다
create policy "relations: insert own" on public.material_relations
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      where m.id = source_id and m.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.materials m
      where m.id = target_id and m.owner_id = (select auth.uid())
    )
  );

create policy "relations: delete own" on public.material_relations
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 공유 페이지에는 같은 프로젝트 안의 관계만 내보낸다.
-- 다른 프로젝트의 자료 제목이 공개되지 않게 하기 위해서다.
create or replace function public.get_shared_project(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', p.name,
    'goal', p.goal,
    'materials', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'title', m.title,
          'type', m.type,
          'importance', m.importance,
          'description', m.description,
          'created_at', m.created_at,
          'authors', m.authors,
          'publisher', m.publisher,
          'publish_date', m.publish_date,
          'year', m.year,
          'language', m.language,
          'url', m.url,
          'access_date', m.access_date,
          'organization', m.organization,
          'identifier', m.identifier,
          'journal', m.journal,
          'volume', m.volume,
          'issue', m.issue,
          'pages', m.pages,
          'relations', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'relation', r.relation,
                'outgoing', r.source_id = m.id,
                'title', other.title
              )
              order by other.title
            )
            from public.material_relations r
            join public.materials other
              on other.id = case when r.source_id = m.id then r.target_id else r.source_id end
            where (r.source_id = m.id or r.target_id = m.id)
              and other.project_id = p.id
          ), '[]'::jsonb)
        )
        order by m.created_at desc, m.title
      )
      from public.materials m
      where m.project_id = p.id
    ), '[]'::jsonb)
  )
  from public.projects p
  where p.share_token = p_token;
$$;
