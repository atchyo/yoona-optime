create or replace function public.ensure_personal_workspace(preferred_workspace_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_profile public.profiles%rowtype;
  auth_display_name text;
  auth_email text;
  resolved_workspace_id uuid;
  resolved_member_id uuid;
  resolved_member_role public.family_role;
  linked_profile_id uuid;
  self_profile_id uuid;
begin
  if current_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    coalesce(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      email,
      '가족 구성원'
    ),
    email
  into auth_display_name, auth_email
  from auth.users
  where id = current_user_id;

  insert into public.profiles (id, display_name)
  values (current_user_id, coalesce(auth_display_name, '가족 구성원'))
  on conflict (id) do update
  set display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name);

  select *
  into current_profile
  from public.profiles
  where id = current_user_id;

  if preferred_workspace_id is not null then
    select family_members.id,
           family_members.workspace_id,
           family_members.role,
           family_members.care_profile_id
    into resolved_member_id,
         resolved_workspace_id,
         resolved_member_role,
         linked_profile_id
    from public.family_members
    where family_members.workspace_id = preferred_workspace_id
      and family_members.user_id = current_user_id
    limit 1;
  end if;

  if resolved_workspace_id is null then
    select family_members.id,
           family_members.workspace_id,
           family_members.role,
           family_members.care_profile_id
    into resolved_member_id,
         resolved_workspace_id,
         resolved_member_role,
         linked_profile_id
    from public.family_members
    join public.family_workspaces on family_workspaces.id = family_members.workspace_id
    where family_members.user_id = current_user_id
    order by
      (family_workspaces.owner_user_id <> current_user_id) desc,
      family_members.created_at desc
    limit 1;
  end if;

  if resolved_workspace_id is null then
    insert into public.family_workspaces (name, owner_user_id)
    values (
      format('%s 가족 약 관리', coalesce(nullif(current_profile.display_name, ''), '우리 가족')),
      current_user_id
    )
    returning id into resolved_workspace_id;

    insert into public.family_members (
      workspace_id,
      user_id,
      role,
      display_name,
      email,
      accessible_profile_ids
    )
    values (
      resolved_workspace_id,
      current_user_id,
      'owner',
      coalesce(nullif(current_profile.display_name, ''), '가족대표'),
      auth_email,
      '{}'
    )
    returning id, role, care_profile_id
    into resolved_member_id, resolved_member_role, linked_profile_id;
  end if;

  if linked_profile_id is not null then
    update public.care_profiles
    set owner_user_id = current_user_id,
        name = coalesce(nullif(name, ''), current_profile.display_name, '가족 구성원')
    where care_profiles.id = linked_profile_id
    returning care_profiles.id into self_profile_id;
  end if;

  if self_profile_id is null then
    select care_profiles.id
    into self_profile_id
    from public.care_profiles
    where care_profiles.workspace_id = resolved_workspace_id
      and care_profiles.owner_user_id = current_user_id
    order by care_profiles.created_at asc
    limit 1;
  end if;

  if self_profile_id is null then
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
      resolved_workspace_id,
      current_user_id,
      coalesce(nullif(current_profile.display_name, ''), '가족 구성원'),
      'self',
      '40',
      '새 약 등록 시 상호작용을 우선 확인합니다.',
      '{}'::jsonb
    )
    returning id into self_profile_id;
  end if;

  update public.family_members
  set display_name = coalesce(nullif(display_name, ''), current_profile.display_name, '가족 구성원'),
      email = coalesce(email, auth_email),
      care_profile_id = coalesce(care_profile_id, self_profile_id),
      accessible_profile_ids = (
        select array_agg(distinct profile_id)
        from unnest(coalesce(accessible_profile_ids, '{}') || array[self_profile_id]) as profile_id
      )
  where family_members.id = resolved_member_id;

  return resolved_workspace_id;
end;
$$;

grant execute on function public.ensure_personal_workspace(uuid) to authenticated;
