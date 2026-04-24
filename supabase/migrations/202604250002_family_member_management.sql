create or replace function public.update_family_member(
  member_id uuid,
  next_display_name text,
  next_email text,
  next_role public.family_role,
  next_accessible_profile_ids uuid[]
)
returns table (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  role public.family_role,
  display_name text,
  email text,
  accessible_profile_ids uuid[],
  care_profile_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_member public.family_members%rowtype;
  normalized_name text;
  normalized_email text;
  resolved_role public.family_role;
  linked_user_id uuid;
  resolved_profile_id uuid;
  resolved_accessible_profile_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into target_member
  from public.family_members
  where family_members.id = member_id;

  if target_member.id is null then
    raise exception '가족 구성원을 찾지 못했습니다.';
  end if;

  if not public.is_family_manager(target_member.workspace_id) then
    raise exception '가족 구성원을 수정할 권한이 없습니다.';
  end if;

  normalized_name := coalesce(nullif(trim(next_display_name), ''), target_member.display_name);
  normalized_email := lower(coalesce(nullif(trim(next_email), ''), target_member.email));
  resolved_role := coalesce(next_role, target_member.role);

  if normalized_name is null then
    raise exception '이름을 입력해 주세요.';
  end if;

  if normalized_email is null then
    raise exception '이메일을 입력해 주세요.';
  end if;

  if target_member.role = 'owner' and resolved_role <> 'owner' then
    raise exception '가족대표 권한은 변경할 수 없습니다.';
  end if;

  if target_member.role <> 'owner' and resolved_role = 'owner' then
    raise exception '가족대표 권한은 부여할 수 없습니다.';
  end if;

  select auth_users.id
  into linked_user_id
  from auth.users as auth_users
  where lower(auth_users.email) = normalized_email
  limit 1;

  if linked_user_id is not null
    and linked_user_id is distinct from target_member.user_id
    and exists (
      select 1
      from public.family_members
      where family_members.workspace_id = target_member.workspace_id
        and family_members.user_id = linked_user_id
        and family_members.id <> member_id
    )
  then
    raise exception '이 이메일로 이미 연결된 가족 구성원이 있습니다.';
  end if;

  if linked_user_id is not null then
    insert into public.profiles (id, display_name)
    values (linked_user_id, normalized_name)
    on conflict (id) do update
    set display_name = excluded.display_name;
  end if;

  resolved_profile_id := target_member.care_profile_id;

  if resolved_profile_id is null and target_member.user_id is not null then
    select care_profiles.id
    into resolved_profile_id
    from public.care_profiles
    where care_profiles.workspace_id = target_member.workspace_id
      and care_profiles.owner_user_id = target_member.user_id
    order by care_profiles.created_at asc
    limit 1;
  end if;

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
      target_member.workspace_id,
      coalesce(target_member.user_id, linked_user_id),
      normalized_name,
      'self',
      '40',
      '가족 구성원 본인의 복용 기록입니다.',
      '{}'::jsonb
    )
    returning care_profiles.id into resolved_profile_id;
  else
    update public.care_profiles
    set name = normalized_name,
        owner_user_id = coalesce(target_member.user_id, linked_user_id, owner_user_id)
    where care_profiles.id = resolved_profile_id;
  end if;

  if resolved_role in ('owner', 'manager') then
    select coalesce(array_agg(care_profiles.id order by care_profiles.created_at), '{}')
    into resolved_accessible_profile_ids
    from public.care_profiles
    where care_profiles.workspace_id = target_member.workspace_id;
  else
    select coalesce(array_agg(distinct profile_id), '{}')
    into resolved_accessible_profile_ids
    from unnest(coalesce(next_accessible_profile_ids, target_member.accessible_profile_ids, '{}') || array[resolved_profile_id]) as profile_id
    where profile_id is not null;
  end if;

  update public.family_members
  set user_id = coalesce(family_members.user_id, linked_user_id),
      role = resolved_role,
      display_name = normalized_name,
      email = normalized_email,
      accessible_profile_ids = resolved_accessible_profile_ids,
      care_profile_id = resolved_profile_id
  where family_members.id = member_id;

  return query
  select
    family_members.id,
    family_members.workspace_id,
    family_members.user_id,
    family_members.role,
    family_members.display_name,
    family_members.email,
    family_members.accessible_profile_ids,
    family_members.care_profile_id
  from public.family_members
  where family_members.id = member_id;
end;
$$;

grant execute on function public.update_family_member(uuid, text, text, public.family_role, uuid[]) to authenticated;

create or replace function public.delete_family_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_member public.family_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into target_member
  from public.family_members
  where family_members.id = member_id;

  if target_member.id is null then
    raise exception '가족 구성원을 찾지 못했습니다.';
  end if;

  if not public.is_family_manager(target_member.workspace_id) then
    raise exception '가족 구성원을 삭제할 권한이 없습니다.';
  end if;

  if target_member.role = 'owner' then
    raise exception '가족대표는 삭제할 수 없습니다.';
  end if;

  delete from public.family_members
  where family_members.id = member_id;

  if target_member.care_profile_id is not null then
    delete from public.care_profiles
    where care_profiles.id = target_member.care_profile_id
      and care_profiles.workspace_id = target_member.workspace_id
      and care_profiles.type <> 'pet';
  end if;
end;
$$;

grant execute on function public.delete_family_member(uuid) to authenticated;
