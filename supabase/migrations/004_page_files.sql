-- Documents and audio stay private until referenced by a published page.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('page-files','page-files',false,20971520,array[
 'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain',
 'audio/mpeg','audio/wav','audio/ogg','audio/mp4']);

create policy "Owners upload files" on storage.objects for insert to authenticated
with check(bucket_id='page-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners read files" on storage.objects for select to authenticated
using(bucket_id='page-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Published file access" on storage.objects for select to anon, authenticated
using(bucket_id='page-files' and exists (
 select 1 from public.published_pages p
 where p.owner_id::text=(storage.foldername(name))[1]
 and exists(select 1 from jsonb_array_elements(p.document->'cards') c where c->'file'->>'path'=name)
));
