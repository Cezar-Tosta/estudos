-- =====================================================================
-- Estudos — esquema do Supabase
-- Cole este arquivo inteiro em: Supabase → SQL Editor → New query → Run
-- É seguro rodar mais de uma vez.
--
-- Pensado para conviver com outros apps no MESMO projeto Supabase:
--   * tudo tem o prefixo "estudos_" (nada colide com tabelas/funções existentes);
--   * NÃO cria trigger em auth.users (não interfere nos cadastros do outro app);
--   * o perfil é criado pelo próprio app no primeiro login (estudos_ensure_profile).
-- =====================================================================

-- ---------- Tipos ----------------------------------------------------
do $$ begin
  create type public.estudos_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estudos_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Tabelas --------------------------------------------------
create table if not exists public.estudos_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       public.estudos_role   not null default 'user',
  status     public.estudos_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.estudos_subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  color      text not null default '#4f46e5',
  start_date date not null,
  end_date   date not null,
  notes      text not null default '',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.estudos_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.estudos_subjects (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  due_date   date not null,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists estudos_subjects_user_idx on public.estudos_subjects (user_id, start_date);
create index if not exists estudos_tasks_user_idx    on public.estudos_tasks (user_id, due_date);
create index if not exists estudos_tasks_subject_idx on public.estudos_tasks (subject_id);

-- ---------- Funções auxiliares (security definer evita recursão de RLS) ----
create or replace function public.estudos_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.estudos_profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create or replace function public.estudos_is_approved()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.estudos_profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

-- ---------- Perfil do usuário logado --------------------------------
-- Chamada pelo app a cada login. Idempotente: cria o perfil se não existir e
-- sempre devolve a linha atual.
-- O PRIMEIRO perfil do sistema vira Administrador já aprovado; os demais entram
-- como Usuário "pending" até um Administrador aprovar.
-- ATENÇÃO (projeto compartilhado): faça o seu login neste app antes de divulgar
-- o endereço, senão quem entrar primeiro (mesmo vindo do outro app) vira admin.
create or replace function public.estudos_ensure_profile(p_full_name text default '')
returns public.estudos_profiles
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.estudos_profiles;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- serializa a decisão "sou o primeiro?" para dois logins simultâneos
  perform pg_advisory_xact_lock(hashtext('estudos_first_admin'));

  insert into public.estudos_profiles (id, email, full_name, role, status)
  select
    uid,
    coalesce(u.email, ''),
    left(coalesce(p_full_name, ''), 100),
    case when exists (select 1 from public.estudos_profiles) then 'user'::public.estudos_role
         else 'admin'::public.estudos_role end,
    case when exists (select 1 from public.estudos_profiles) then 'pending'::public.estudos_status
         else 'approved'::public.estudos_status end
  from auth.users u
  where u.id = uid
  on conflict (id) do nothing;

  select * into result from public.estudos_profiles where id = uid;
  return result;
end;
$$;

-- Só usuários logados executam (nada de anon).
revoke execute on function
  public.estudos_is_admin(), public.estudos_is_approved(), public.estudos_ensure_profile(text)
  from public, anon;
grant execute on function
  public.estudos_is_admin(), public.estudos_is_approved(), public.estudos_ensure_profile(text)
  to authenticated;

-- ---------- Row Level Security --------------------------------------
alter table public.estudos_profiles enable row level security;
alter table public.estudos_subjects enable row level security;
alter table public.estudos_tasks    enable row level security;

-- profiles: cada um lê o próprio; admin lê todos.
-- Só admin altera (aprovar / recusar / mudar perfil) e nunca a própria linha
-- (evita o último admin se rebaixar). Não há INSERT/DELETE direto pelo cliente.
drop policy if exists estudos_profiles_select on public.estudos_profiles;
create policy estudos_profiles_select on public.estudos_profiles
  for select to authenticated
  using (id = auth.uid() or public.estudos_is_admin());

drop policy if exists estudos_profiles_admin_update on public.estudos_profiles;
create policy estudos_profiles_admin_update on public.estudos_profiles
  for update to authenticated
  using (public.estudos_is_admin() and id <> auth.uid())
  with check (public.estudos_is_admin() and id <> auth.uid());

-- subjects / tasks: dados privados de cada usuário APROVADO.
drop policy if exists estudos_subjects_owner on public.estudos_subjects;
create policy estudos_subjects_owner on public.estudos_subjects
  for all to authenticated
  using (user_id = auth.uid() and public.estudos_is_approved())
  with check (user_id = auth.uid() and public.estudos_is_approved());

drop policy if exists estudos_tasks_owner on public.estudos_tasks;
create policy estudos_tasks_owner on public.estudos_tasks
  for all to authenticated
  using (user_id = auth.uid() and public.estudos_is_approved())
  with check (
    user_id = auth.uid()
    and public.estudos_is_approved()
    and exists (
      select 1 from public.estudos_subjects s
      where s.id = subject_id and s.user_id = auth.uid()
    )
  );

-- ---------- Permissões da API ---------------------------------------
revoke all on public.estudos_profiles, public.estudos_subjects, public.estudos_tasks from anon;
grant select, update on public.estudos_profiles to authenticated;
grant select, insert, update, delete on public.estudos_subjects, public.estudos_tasks to authenticated;
