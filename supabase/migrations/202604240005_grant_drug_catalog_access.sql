grant usage on schema public to authenticated, service_role;

grant select on public.drug_catalog_items to authenticated;
grant select on public.drug_catalog_sync_runs to authenticated;

grant select, insert, update, delete on public.drug_catalog_items to service_role;
grant select, insert, update, delete on public.drug_catalog_sync_runs to service_role;
