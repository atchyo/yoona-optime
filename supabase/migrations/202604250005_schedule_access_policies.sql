drop policy if exists "Members can read schedules" on public.medication_schedules;
drop policy if exists "Members can manage schedules" on public.medication_schedules;
drop policy if exists "Authorized users can read schedules" on public.medication_schedules;
create policy "Authorized users can read schedules" on public.medication_schedules
for select using (
  exists (
    select 1
    from public.medications
    where medications.id = medication_schedules.medication_id
      and public.can_access_care_profile(medications.care_profile_id)
  )
);

drop policy if exists "Authorized users can insert schedules" on public.medication_schedules;
create policy "Authorized users can insert schedules" on public.medication_schedules
for insert with check (
  exists (
    select 1
    from public.medications
    where medications.id = medication_schedules.medication_id
      and public.can_manage_care_profile(medications.care_profile_id)
  )
);

drop policy if exists "Authorized users can update schedules" on public.medication_schedules;
create policy "Authorized users can update schedules" on public.medication_schedules
for update using (
  exists (
    select 1
    from public.medications
    where medications.id = medication_schedules.medication_id
      and public.can_manage_care_profile(medications.care_profile_id)
  )
) with check (
  exists (
    select 1
    from public.medications
    where medications.id = medication_schedules.medication_id
      and public.can_manage_care_profile(medications.care_profile_id)
  )
);

drop policy if exists "Authorized users can delete schedules" on public.medication_schedules;
create policy "Authorized users can delete schedules" on public.medication_schedules
for delete using (
  exists (
    select 1
    from public.medications
    where medications.id = medication_schedules.medication_id
      and public.can_manage_care_profile(medications.care_profile_id)
  )
);

drop policy if exists "Members can read medication logs" on public.medication_logs;
drop policy if exists "Members can create medication logs" on public.medication_logs;
drop policy if exists "Authorized users can read medication logs" on public.medication_logs;
create policy "Authorized users can read medication logs" on public.medication_logs
for select using (
  exists (
    select 1
    from public.medications
    where medications.id = medication_logs.medication_id
      and public.can_access_care_profile(medications.care_profile_id)
  )
);

drop policy if exists "Authorized users can create medication logs" on public.medication_logs;
create policy "Authorized users can create medication logs" on public.medication_logs
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.medications
    where medications.id = medication_logs.medication_id
      and public.can_manage_care_profile(medications.care_profile_id)
  )
);
