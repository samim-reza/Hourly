-- Storage bucket and policies for screenshots

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Freelancers upload to their own folder
create policy "Freelancers upload screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Freelancers read own screenshots"
  on storage.objects for select
  using (
    bucket_id = 'screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Clients read project screenshots"
  on storage.objects for select
  using (
    bucket_id = 'screenshots'
    and exists (
      select 1
      from public.screenshots s
      join public.time_entries te on te.id = s.time_entry_id
      join public.projects p on p.id = te.project_id
      where s.storage_path = name and p.client_id = auth.uid()
    )
  );
