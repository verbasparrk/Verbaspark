-- Hidden blocks must be absent from the public JSON, not just visually hidden.
create or replace function public.publish_page(requested_slug text,expected_revision bigint,expected_owner uuid)
returns text language plpgsql security definer set search_path='' as $$
declare saved public.drafts; snapshot jsonb;
begin
 if auth.uid() is null or auth.uid() is distinct from expected_owner then raise exception 'Account changed'; end if;
 select * into saved from public.drafts where owner_id=auth.uid() for update;
 if not found or saved.revision is distinct from expected_revision then raise exception 'DRAFT_CONFLICT' using errcode='VS409'; end if;
 snapshot:=jsonb_set(saved.document,'{cards}',coalesce((
  select jsonb_agg(card order by ordinal) from jsonb_array_elements(saved.document->'cards') with ordinality as items(card,ordinal)
  where card->'hidden' is distinct from 'true'::jsonb
 ),'[]'::jsonb));
 insert into public.published_pages(owner_id,slug,document) values(auth.uid(),requested_slug,snapshot)
 on conflict(owner_id) do update set slug=excluded.slug,document=excluded.document,published_at=now();
 return requested_slug;
end $$;
revoke all on function public.publish_page(text,bigint,uuid) from public;
grant execute on function public.publish_page(text,bigint,uuid) to authenticated;

update public.published_pages set document=jsonb_set(document,'{cards}',coalesce((
 select jsonb_agg(card order by ordinal) from jsonb_array_elements(document->'cards') with ordinality as items(card,ordinal)
 where card->'hidden' is distinct from 'true'::jsonb
),'[]'::jsonb));
