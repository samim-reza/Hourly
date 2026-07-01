-- Hourly: Time Tracker schema with Row Level Security

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'freelancer' check (role in ('freelancer', 'client')),
  hourly_rate numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.profiles(id) on delete set null,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Time entries
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start timestamptz not null,
  "end" timestamptz,
  duration_seconds integer not null default 0,
  memo text,
  status text not null default 'stopped' check (status in ('running', 'paused', 'stopped')),
  created_at timestamptz not null default now()
);

-- Screenshots
create table public.screenshots (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references public.time_entries(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Activity logs (counts only — never keystroke content)
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references public.time_entries(id) on delete cascade,
  interval_start timestamptz not null,
  keys_count integer not null default 0,
  clicks_count integer not null default 0,
  activity_percent numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_projects_freelancer on public.projects(freelancer_id);
create index idx_projects_client on public.projects(client_id);
create index idx_time_entries_project on public.time_entries(project_id);
create index idx_time_entries_user on public.time_entries(user_id);
create index idx_screenshots_entry on public.screenshots(time_entry_id);
create index idx_activity_logs_entry on public.activity_logs(time_entry_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'freelancer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.screenshots enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles: users see own profile; freelancers see clients on their projects
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Freelancers see project clients"
  on public.profiles for select
  using (
    exists (
      select 1 from public.projects p
      where p.client_id = profiles.id and p.freelancer_id = auth.uid()
    )
  );

-- Projects
create policy "Freelancers manage own projects"
  on public.projects for all
  using (freelancer_id = auth.uid());

create policy "Clients read assigned projects"
  on public.projects for select
  using (client_id = auth.uid());

-- Time entries
create policy "Freelancers manage own entries"
  on public.time_entries for all
  using (user_id = auth.uid());

create policy "Clients read project entries"
  on public.time_entries for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = time_entries.project_id and p.client_id = auth.uid()
    )
  );

-- Screenshots
create policy "Freelancers manage own screenshots"
  on public.screenshots for all
  using (
    exists (
      select 1 from public.time_entries te
      where te.id = screenshots.time_entry_id and te.user_id = auth.uid()
    )
  );

create policy "Clients read project screenshots"
  on public.screenshots for select
  using (
    exists (
      select 1 from public.time_entries te
      join public.projects p on p.id = te.project_id
      where te.id = screenshots.time_entry_id and p.client_id = auth.uid()
    )
  );

-- Activity logs
create policy "Freelancers manage own activity"
  on public.activity_logs for all
  using (
    exists (
      select 1 from public.time_entries te
      where te.id = activity_logs.time_entry_id and te.user_id = auth.uid()
    )
  );

create policy "Clients read project activity"
  on public.activity_logs for select
  using (
    exists (
      select 1 from public.time_entries te
      join public.projects p on p.id = te.project_id
      where te.id = activity_logs.time_entry_id and p.client_id = auth.uid()
    )
  );

-- Storage bucket for screenshots (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', false);
