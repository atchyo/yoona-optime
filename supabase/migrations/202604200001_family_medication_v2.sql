create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, '가족 구성원'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.family_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.family_role as enum ('owner', 'manager', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.profile_type as enum ('self', 'parent', 'child', 'pet');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.drug_source as enum ('mfds_permit', 'mfds_easy', 'rxnorm', 'dailymed', 'openfda', 'manual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.medication_status as enum ('confirmed', 'temporary', 'needs_review');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.scan_status as enum ('uploaded', 'ocr_done', 'matched', 'manual_needed', 'confirmed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reminder_type as enum ('daily', 'weekly', 'cycle', 'duration_review');
exception when duplicate_object then null;
end $$;

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null default 'member',
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table if not exists public.care_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  name text not null,
  type public.profile_type not null,
  age_group text not null check (age_group in ('20', '40', '60')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ocr_scans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  care_profile_id uuid not null references public.care_profiles(id) on delete cascade,
  status public.scan_status not null default 'uploaded',
  raw_text text not null default '',
  extracted_names text[] not null default '{}',
  confidence numeric not null default 0,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_photos (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.ocr_scans(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  size_bytes integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.drug_database_matches (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.ocr_scans(id) on delete cascade,
  source public.drug_source not null,
  product_name text not null,
  manufacturer text,
  ingredients jsonb not null default '[]'::jsonb,
  dosage_form text,
  efficacy text,
  usage text,
  warnings text[] not null default '{}',
  interactions text[] not null default '{}',
  confidence numeric not null default 0,
  selected_at timestamptz
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  care_profile_id uuid not null references public.care_profiles(id) on delete cascade,
  status public.medication_status not null default 'confirmed',
  product_name text not null,
  nickname text,
  source public.drug_source not null,
  ingredients jsonb not null default '[]'::jsonb,
  dosage text,
  instructions text,
  warnings text[] not null default '{}',
  interactions text[] not null default '{}',
  started_at date not null default current_date,
  review_at date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.temporary_medications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  care_profile_id uuid not null references public.care_profiles(id) on delete cascade,
  raw_name text not null,
  raw_text text not null default '',
  note text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  type public.reminder_type not null,
  label text not null,
  time_of_day time not null,
  days_of_week text[],
  next_due_at timestamptz not null,
  review_at date
);

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  schedule_id uuid references public.medication_schedules(id) on delete set null,
  taken_at timestamptz not null default now(),
  note text,
  created_by uuid not null references public.profiles(id) on delete cascade
);

create table if not exists public.rule_based_chat_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  care_profile_id uuid not null references public.care_profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  findings jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.family_workspaces enable row level security;
alter table public.family_members enable row level security;
alter table public.care_profiles enable row level security;
alter table public.ocr_scans enable row level security;
alter table public.medication_photos enable row level security;
alter table public.drug_database_matches enable row level security;
alter table public.medications enable row level security;
alter table public.temporary_medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_logs enable row level security;
alter table public.rule_based_chat_logs enable row level security;

create or replace function public.is_family_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_manager(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

create policy "Users can read own profile" on public.profiles
for select using (id = auth.uid());

create policy "Users can update own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can read workspace" on public.family_workspaces
for select using (public.is_family_member(id));

create policy "Owners can update workspace" on public.family_workspaces
for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "Members can read family members" on public.family_members
for select using (public.is_family_member(workspace_id));

create policy "Managers can manage family members" on public.family_members
for all using (public.is_family_manager(workspace_id)) with check (public.is_family_manager(workspace_id));

create policy "Members can read care profiles" on public.care_profiles
for select using (public.is_family_member(workspace_id));

create policy "Managers can manage care profiles" on public.care_profiles
for all using (public.is_family_manager(workspace_id)) with check (public.is_family_manager(workspace_id));

create policy "Members can read scans" on public.ocr_scans
for select using (public.is_family_member(workspace_id));

create policy "Members can create scans" on public.ocr_scans
for insert with check (public.is_family_member(workspace_id) and created_by = auth.uid());

create policy "Members can read medication photos" on public.medication_photos
for select using (
  exists (
    select 1 from public.ocr_scans
    where ocr_scans.id = medication_photos.scan_id
      and public.is_family_member(ocr_scans.workspace_id)
  )
);

create policy "Members can manage medication photos" on public.medication_photos
for all using (
  exists (
    select 1 from public.ocr_scans
    where ocr_scans.id = medication_photos.scan_id
      and public.is_family_member(ocr_scans.workspace_id)
  )
) with check (
  exists (
    select 1 from public.ocr_scans
    where ocr_scans.id = medication_photos.scan_id
      and public.is_family_member(ocr_scans.workspace_id)
  )
);

create policy "Members can read drug matches" on public.drug_database_matches
for select using (
  exists (
    select 1 from public.ocr_scans
    where ocr_scans.id = drug_database_matches.scan_id
      and public.is_family_member(ocr_scans.workspace_id)
  )
);

create policy "Members can manage drug matches" on public.drug_database_matches
for all using (
  exists (
    select 1 from public.ocr_scans
    where ocr_scans.id = drug_database_matches.scan_id
      and public.is_family_member(ocr_scans.workspace_id)
  )
) with check (
  exists (
    select 1 from public.ocr_scans
    where ocr_scans.id = drug_database_matches.scan_id
      and public.is_family_member(ocr_scans.workspace_id)
  )
);

create policy "Members can read medications" on public.medications
for select using (public.is_family_member(workspace_id));

create policy "Members can manage medications" on public.medications
for all using (public.is_family_member(workspace_id)) with check (public.is_family_member(workspace_id) and created_by = auth.uid());

create policy "Members can read temporary medications" on public.temporary_medications
for select using (public.is_family_member(workspace_id));

create policy "Members can manage temporary medications" on public.temporary_medications
for all using (public.is_family_member(workspace_id)) with check (public.is_family_member(workspace_id) and created_by = auth.uid());

create policy "Members can read schedules" on public.medication_schedules
for select using (
  exists (
    select 1 from public.medications
    where medications.id = medication_schedules.medication_id
      and public.is_family_member(medications.workspace_id)
  )
);

create policy "Members can manage schedules" on public.medication_schedules
for all using (
  exists (
    select 1 from public.medications
    where medications.id = medication_schedules.medication_id
      and public.is_family_member(medications.workspace_id)
  )
) with check (
  exists (
    select 1 from public.medications
    where medications.id = medication_schedules.medication_id
      and public.is_family_member(medications.workspace_id)
  )
);

create policy "Members can read medication logs" on public.medication_logs
for select using (
  exists (
    select 1 from public.medications
    where medications.id = medication_logs.medication_id
      and public.is_family_member(medications.workspace_id)
  )
);

create policy "Members can create medication logs" on public.medication_logs
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.medications
    where medications.id = medication_logs.medication_id
      and public.is_family_member(medications.workspace_id)
  )
);

create policy "Members can read chat logs" on public.rule_based_chat_logs
for select using (public.is_family_member(workspace_id));

create policy "Members can create chat logs" on public.rule_based_chat_logs
for insert with check (public.is_family_member(workspace_id) and created_by = auth.uid());
