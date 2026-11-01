-- 읽기 전용 공유 링크. 토큰이 없으면 비공개, 토큰을 지우면 공유 중지.
alter table public.projects add column share_token uuid unique;

-- 비로그인 방문자는 RLS로 테이블을 읽을 수 없으므로 이 함수로만 조회한다.
-- 저장 위치와 소유자/내부 ID는 일부러 돌려주지 않는다.
create function public.get_shared_project(p_token uuid)
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
          'pages', m.pages
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

revoke execute on function public.get_shared_project(uuid) from public;
grant execute on function public.get_shared_project(uuid) to anon, authenticated;
