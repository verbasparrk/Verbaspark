-- Run once after 010_platform_admin.sql.
-- Keep moderation events while removing the deleted account's email address.
create function public.platform_redact_deleted_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.platform_audit
 set target_email='[deleted account]'
 where owner_id=old.id;
 delete from public.platform_limits
 where key like 'contact:'||old.id::text||':%';
 return old;
end $$;
create trigger platform_redact_deleted_account before delete on auth.users
for each row execute function public.platform_redact_deleted_account();
revoke all on function public.platform_redact_deleted_account() from public,anon,authenticated;

-- The API checks this marker before permitting deletion, so deployment can precede this migration.
create function public.platform_deletion_ready() returns boolean
language sql stable security definer set search_path='' as $$select true$$;
revoke all on function public.platform_deletion_ready() from public,anon,authenticated;
grant execute on function public.platform_deletion_ready() to service_role;
