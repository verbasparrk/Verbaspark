import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {referencedFiles,storageSummary,cleanupUnused} from '../server/storage-usage.js';
import {validHostname,dnsInstructions,domainClaimVerified} from '../server/domains.js';

const alice='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('storage cleanup protects online draft and published attachments, and keeps recent uploads',()=>{
 const draft={cards:[{imagePath:alice+'/draft.webp',images:[{imagePath:alice+'/gallery.webp'}],file:{path:alice+'/catalog.pdf'}}],profile:{seo:{imagePath:alice+'/cover.webp'}}};
 const refs=referencedFiles(draft);assert.equal(refs.images.size,3);assert.ok(refs.files.has(alice+'/catalog.pdf'));
 const files=[{bucket:'page-images',path:alice+'/draft.webp',size:10,createdAt:'2020-01-01'},
  {bucket:'page-files',path:alice+'/catalog.pdf',size:20,createdAt:'2020-01-01'},
  {bucket:'page-images',path:alice+'/orphan.webp',size:30,createdAt:'2020-01-01'},
  {bucket:'page-images',path:alice+'/recent.webp',size:40,createdAt:'2026-09-24'}];
 const protectedSet=new Set([...refs.images].map(path=>'page-images:'+path).concat([...refs.files].map(path=>'page-files:'+path)));
 const summary=storageSummary(files,protectedSet,Date.parse('2026-09-25'));assert.equal(summary.used,100);assert.deepEqual(summary.eligible.map(item=>item.path),[alice+'/orphan.webp']);
});

test('cleanup removes only old files unused by either saved version or the current browser draft',async()=>{
 const old='2020-01-01T00:00:00Z',removed=[];
 const db={from(table){return {select(){return {eq(){return {maybeSingle:async()=>({data:{document:table==='drafts'?{cards:[{imagePath:alice+'/draft.webp'}]}:{cards:[{file:{path:alice+'/public.pdf'}}]}}})}}}}}},storage:{from(bucket){return {list:async()=>({data:bucket==='page-images'?[{id:'1',name:'draft.webp',metadata:{size:10},created_at:old},{id:'2',name:'orphan.webp',metadata:{size:20},created_at:old},{id:'3',name:'local.webp',metadata:{size:30},created_at:old}]:[{id:'4',name:'public.pdf',metadata:{size:40},created_at:old}]}),remove:async paths=>{removed.push(...paths);return {data:paths}}}}}};
 const result=await cleanupUnused(db,alice,['page-images:'+alice+'/local.webp']);assert.equal(result.removed,1);assert.deepEqual(removed,[alice+'/orphan.webp']);
});

test('custom domain validation rejects URLs, platform domains and invalid hosts',()=>{
 assert.equal(validHostname(' WWW.Example.COM. '),'www.example.com');
 for(const value of ['https://example.com','localhost','a.vercel.app','a.chatgpt.site','127.0.0.1','-bad.example','example.com/path'])assert.equal(validHostname(value),'');
 assert.deepEqual(dnsInstructions({recommendedCNAME:[{value:'cname.vercel-dns.com'}],misconfigured:true},{verification:[{type:'TXT',domain:'_vercel.example.com',value:'token'}]}).records,[{type:'CNAME',value:'cname.vercel-dns.com'}]);
});

test('domain activation requires the profile-specific TXT record',async()=>{
 const token='11111111-1111-4111-8111-111111111111';
 assert.equal(await domainClaimVerified('alice.example.com',token,async()=>[['verbaspark-verify='+token]]),true);
 assert.equal(await domainClaimVerified('alice.example.com',token,async()=>[['wrong-token']]),false);
});

test('migration 012 enforces private reports, domain ownership and account storage quota',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create schema storage;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
   alter table storage.objects enable row level security;
   create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
   create policy "Owners upload images" on storage.objects for insert to authenticated with check(bucket_id='page-images' and (storage.foldername(name))[1]=auth.uid()::text);
   create policy "Owners upload files" on storage.objects for insert to authenticated with check(bucket_id='page-files' and (storage.foldername(name))[1]=auth.uid()::text);
   grant usage on schema public,auth,storage to anon,authenticated,service_role;
   grant select,insert on storage.objects to authenticated;
   insert into auth.users values('${alice}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/012_platform_extensions.sql',import.meta.url),'utf8'));
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);await db.exec('set role authenticated');
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('page-images',$1,'{\"size\":199000000}')",[alice+'/first.webp']);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('page-files',$1,'{\"size\":20000000}')",[alice+'/second.pdf']),/row-level security/);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('page-images',$1,'{\"size\":1}')",['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/other.webp']),/row-level security/);
  await assert.rejects(db.query('select * from public.profile_reports'),/permission denied/);
  await assert.rejects(db.query("insert into public.profile_reports(owner_id,slug,reason,reporter_hash) values($1,'alice','spam','hash')",[alice]),/permission denied/);
  await db.exec('reset role');await db.query("insert into public.profile_domains(owner_id,hostname) values($1,'alice.example.com')",[alice]);
  await db.exec('set role authenticated');assert.equal((await db.query('select hostname from public.profile_domains')).rows[0].hostname,'alice.example.com');
 }finally{await db.close()}
});
