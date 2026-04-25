update public.care_profiles as care_profile
set name = coalesce(nullif(profile.display_name, ''), auth_user.email, '가족 구성원')
from public.profiles as profile
left join auth.users as auth_user on auth_user.id = profile.id
where care_profile.owner_user_id = profile.id
  and care_profile.type = 'self'
  and trim(care_profile.name) in ('나', '본인', '가족 구성원');
