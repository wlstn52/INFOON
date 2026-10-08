-- INFOON 초기 스키마: 유저 정보(profiles) / 프로젝트(projects) / 자료(materials)
-- 로그인 계정(이메일/비밀번호)은 Supabase Auth(auth.users)가 관리하고,
-- 비밀번호는 이 스키마에 저장하지 않는다.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  goal text not null default '',
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  type text not null,
  location text not null default '',
  importance smallint not null default 3 check (importance between 1 and 5),
  description text not null default '',
  created_at date not null default current_date,
  -- 인용 생성용 세부 사항 (모두 선택)
  authors jsonb,
  publisher text,
  publish_date text,
  year text,
  language text,
  url text,
  access_date text,
  organization text,
  identifier text
);

create index materials_owner_id_idx on public.materials (owner_id);
create index materials_project_id_idx on public.materials (project_id);

-- 회원가입 시 profiles 행 자동 생성 (이름은 signUp의 options.data.name 에서 가져옴)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

-- 트리거 전용 함수이므로 API(RPC)로 직접 호출하지 못하게 막는다
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: 본인 데이터만 접근
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.materials enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "projects: manage own" on public.projects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "materials: manage own" on public.materials
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );
