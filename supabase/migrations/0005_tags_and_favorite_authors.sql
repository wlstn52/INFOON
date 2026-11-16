-- 자료 태그와 관심 저자
alter table public.materials
  add column tags text[] not null default '{}'
  check (cardinality(tags) <= 10);

-- 관심 저자 목록 [{ "key": "...", "label": "..." }]. 본인만 읽고 쓴다 (profiles RLS).
alter table public.profiles
  add column favorite_authors jsonb not null default '[]'
  check (jsonb_typeof(favorite_authors) = 'array');

-- 공유 페이지에 태그를 함께 내보낸다
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
          'tags', m.tags,
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
