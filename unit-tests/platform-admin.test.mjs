import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('platform moderation is private, audited and cannot be bypassed by republishing',async()=>{
 const db=new PGlite();
 const alice='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',moderator='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
   create table public.published_pages(owner_id uuid primary key references auth.users(id) on delete cascade,slug text unique,document jsonb,published_at timestamptz default now());
   alter table public.published_pages enable row level security;
   create policy "Published pages are readable" on public.published_pages for select to anon,authenticated using(true);
   create policy "Owners can unpublish" on public.published_pages for delete to authenticated using(owner_id=auth.uid());
   grant usage on schema public,auth to anon,authenticated,service_role;
   grant select,delete on public.published_pages to anon,authenticated;
   grant all on public.published_pages to service_role;
   create table public.profile_metrics(owner_id uuid,day date,event text,card text,total bigint);
   create table public.platform_limits(key text primary key,total integer,expires_at timestamptz);
   insert into auth.users(id,email) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','alice@example.com'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','admin@example.com');
   insert into public.published_pages(owner_id,slug,document)
   values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','alice','{"name":"Alice","cards":[]}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/010_platform_admin.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/011_account_deletion.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select public.platform_deletion_ready() as ready')).rows[0].ready,true);
  await db.query('insert into public.platform_admins(user_id) values($1)',[moderator]);
  const login=async(id,role)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role)};
  await login('', 'anon');
  assert.equal((await db.query('select slug from public.published_pages')).rows.length,1);
  await assert.rejects(db.query("select public.platform_admin_summary()"),/permission denied/);
  await assert.rejects(db.query('select * from public.platform_accounts'),/permission denied/);
  await login(moderator,'service_role');
  const before=(await db.query('select public.platform_admin_summary() as summary')).rows[0].summary;
  assert.equal(before.accounts,2);assert.equal(before.live,1);
  await db.query("select public.platform_set_moderation($1,true,'Unsafe public content',$2)",[alice,moderator]);
  const hidden=(await db.query('select public.platform_admin_summary() as summary')).rows[0].summary;
  assert.equal(hidden.live,0);assert.equal(hidden.hidden,1);
  const listing=await db.query("select * from public.platform_admin_list('alice','hidden',0,25)");
  assert.equal(listing.rows[0].slug,'alice');assert.equal(listing.rows[0].matching_count,1);
  assert.equal((await db.query('select action from public.platform_audit')).rows[0].action,'hide');
  await login('', 'anon');
  assert.equal((await db.query('select slug from public.published_pages')).rows.length,0);
  await login(alice,'authenticated');
  assert.equal((await db.query('select slug from public.published_pages')).rows.length,1);
  assert.equal((await db.query('select reason from public.platform_restrictions')).rows[0].reason,'Unsafe public content');
  await db.query('delete from public.published_pages where owner_id=$1',[alice]);
  await login(moderator,'service_role');
  await assert.rejects(db.query('insert into public.published_pages(owner_id,slug,document) values($1,$2,$3)',[alice,'again',JSON.stringify({name:'Alice'})]),/Publication restricted/);
  await assert.rejects(db.query("select public.platform_set_moderation($1,false,'Restore now',$2)",[alice,alice]),/Administrator access required/);
  await db.query("select public.platform_set_moderation($1,false,'Review complete',$2)",[alice,moderator]);
  await db.query('insert into public.published_pages(owner_id,slug,document) values($1,$2,$3)',[alice,'again',JSON.stringify({name:'Alice'})]);
  await login('', 'anon');
  assert.equal((await db.query('select slug from public.published_pages')).rows[0].slug,'again');
  await db.exec('reset role');
  await db.query("insert into auth.users(id,email) values('cccccccc-cccc-cccc-cccc-cccccccccccc','new@example.com')");
  assert.equal((await db.query("select email from public.platform_accounts where email='new@example.com'")).rows.length,1);
  await db.query('delete from auth.users where id=$1',[alice]);
  assert.equal((await db.query('select target_email from public.platform_audit where action=\'hide\'')).rows[0].target_email,'[deleted account]');
 }finally{await db.close()}
});
