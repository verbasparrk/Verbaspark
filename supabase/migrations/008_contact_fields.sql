-- Existing messages remain readable. Optional email allows forms without an email field.
alter table public.contact_messages alter column email drop not null;
alter table public.contact_messages add column answers jsonb not null default '[]'::jsonb
 check(jsonb_typeof(answers)='array' and jsonb_array_length(answers)<=12 and octet_length(answers::text)<=20000);
