-- 논문 인용에 필요한 학술지 정보 (모두 선택)
alter table public.materials
  add column journal text,
  add column volume text,
  add column issue text,
  add column pages text;
