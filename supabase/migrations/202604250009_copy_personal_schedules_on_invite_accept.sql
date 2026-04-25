create or replace function public.accept_family_invitation(
  invitation_id uuid,
  import_personal_records boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  auth_email text;
  current_profile public.profiles%rowtype;
  target_invitation public.family_invitations%rowtype;
  existing_member_id uuid;
  resolved_profile_id uuid;
  source_profile_id uuid;
  source_medication record;
  new_medication_id uuid;
begin
  if current_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select auth.users.email
  into auth_email
  from auth.users
  where auth.users.id = current_user_id;

  select *
  into target_invitation
  from public.family_invitations
  where family_invitations.id = invitation_id
    and family_invitations.status = 'pending'
    and lower(family_invitations.email) = lower(coalesce(auth_email, ''));

  if target_invitation.id is null then
    raise exception '수락할 가족 초대를 찾지 못했습니다.';
  end if;

  insert into public.profiles (id, display_name)
  values (current_user_id, target_invitation.display_name)
  on conflict (id) do update
  set display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name);

  select *
  into current_profile
  from public.profiles
  where profiles.id = current_user_id;

  resolved_profile_id := target_invitation.care_profile_id;

  select family_members.id, coalesce(resolved_profile_id, family_members.care_profile_id)
  into existing_member_id, resolved_profile_id
  from public.family_members
  where family_members.workspace_id = target_invitation.workspace_id
    and (
      family_members.user_id = current_user_id
      or (
        target_invitation.care_profile_id is not null
        and family_members.care_profile_id = target_invitation.care_profile_id
      )
      or (
        family_members.user_id is null
        and lower(coalesce(family_members.email, '')) = lower(coalesce(auth_email, ''))
      )
    )
  order by
    (family_members.care_profile_id = target_invitation.care_profile_id) desc,
    (family_members.user_id = current_user_id) desc,
    family_members.created_at asc
  limit 1;

  if resolved_profile_id is null then
    insert into public.care_profiles (
      workspace_id,
      owner_user_id,
      name,
      type,
      age_group,
      notes,
      pet_details
    )
    values (
      target_invitation.workspace_id,
      current_user_id,
      coalesce(nullif(target_invitation.display_name, ''), nullif(current_profile.display_name, ''), '가족 구성원'),
      'self',
      '40',
      '가족 구성원 본인의 복용 기록입니다.',
      '{}'::jsonb
    )
    returning care_profiles.id into resolved_profile_id;
  else
    update public.care_profiles
    set owner_user_id = current_user_id,
        name = coalesce(nullif(target_invitation.display_name, ''), name)
    where care_profiles.id = resolved_profile_id;
  end if;

  if existing_member_id is null then
    insert into public.family_members (
      workspace_id,
      user_id,
      role,
      display_name,
      email,
      accessible_profile_ids,
      care_profile_id
    )
    values (
      target_invitation.workspace_id,
      current_user_id,
      target_invitation.role,
      target_invitation.display_name,
      auth_email,
      array[resolved_profile_id],
      resolved_profile_id
    );
  else
    update public.family_members
    set user_id = current_user_id,
        role = target_invitation.role,
        display_name = target_invitation.display_name,
        email = auth_email,
        care_profile_id = resolved_profile_id,
        accessible_profile_ids = (
          select array_agg(distinct profile_id)
          from unnest(coalesce(accessible_profile_ids, '{}') || array[resolved_profile_id]) as profile_id
        )
    where family_members.id = existing_member_id;
  end if;

  if import_personal_records then
    select care_profiles.id
    into source_profile_id
    from public.care_profiles
    join public.family_workspaces on family_workspaces.id = care_profiles.workspace_id
    where care_profiles.owner_user_id = current_user_id
      and care_profiles.workspace_id <> target_invitation.workspace_id
      and family_workspaces.owner_user_id = current_user_id
    order by care_profiles.created_at asc
    limit 1;

    if source_profile_id is not null then
      create temporary table if not exists invitation_medication_copy_map (
        old_id uuid primary key,
        new_id uuid not null
      ) on commit drop;

      truncate table invitation_medication_copy_map;

      for source_medication in
        select *
        from public.medications
        where medications.care_profile_id = source_profile_id
      loop
        select medications.id
        into new_medication_id
        from public.medications
        where medications.care_profile_id = resolved_profile_id
          and medications.product_name = source_medication.product_name
          and medications.source = source_medication.source
        order by medications.created_at asc
        limit 1;

        if new_medication_id is null then
          insert into public.medications (
            workspace_id,
            care_profile_id,
            status,
            product_name,
            nickname,
            source,
            ingredients,
            dosage,
            instructions,
            warnings,
            interactions,
            started_at,
            review_at,
            created_by
          )
          values (
            target_invitation.workspace_id,
            resolved_profile_id,
            source_medication.status,
            source_medication.product_name,
            source_medication.nickname,
            source_medication.source,
            source_medication.ingredients,
            source_medication.dosage,
            source_medication.instructions,
            source_medication.warnings,
            source_medication.interactions,
            source_medication.started_at,
            source_medication.review_at,
            current_user_id
          )
          returning medications.id into new_medication_id;
        end if;

        insert into invitation_medication_copy_map (old_id, new_id)
        values (source_medication.id, new_medication_id)
        on conflict (old_id) do update
        set new_id = excluded.new_id;
      end loop;

      insert into public.medication_schedules (
        medication_id,
        type,
        label,
        time_of_day,
        days_of_week,
        next_due_at,
        review_at
      )
      select
        copied.new_id,
        source_schedules.type,
        source_schedules.label,
        source_schedules.time_of_day,
        source_schedules.days_of_week,
        source_schedules.next_due_at,
        source_schedules.review_at
      from public.medication_schedules as source_schedules
      join invitation_medication_copy_map as copied on copied.old_id = source_schedules.medication_id
      where not exists (
        select 1
        from public.medication_schedules as existing_schedules
        where existing_schedules.medication_id = copied.new_id
          and existing_schedules.type = source_schedules.type
          and existing_schedules.label = source_schedules.label
          and existing_schedules.time_of_day = source_schedules.time_of_day
      );

      insert into public.medication_logs (
        medication_id,
        schedule_id,
        taken_at,
        note,
        created_by
      )
      select
        copied.new_id,
        null,
        source_logs.taken_at,
        source_logs.note,
        current_user_id
      from public.medication_logs as source_logs
      join invitation_medication_copy_map as copied on copied.old_id = source_logs.medication_id
      where not exists (
        select 1
        from public.medication_logs as existing_logs
        where existing_logs.medication_id = copied.new_id
          and existing_logs.taken_at = source_logs.taken_at
          and coalesce(existing_logs.note, '') = coalesce(source_logs.note, '')
      );
    end if;
  end if;

  update public.family_invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      care_profile_id = resolved_profile_id,
      responded_at = now()
  where family_invitations.id = target_invitation.id;

  return target_invitation.workspace_id;
end;
$$;

grant execute on function public.accept_family_invitation(uuid, boolean) to authenticated;
