import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {sendContactNotification,processContactNotifications} from '../server/notifications.js';
import {cleanPage} from '../src/page-data.js';
import {newBlock,duplicateBlock} from '../src/content-library.js';

test('notification migration queues only opted-in published contacts and leases one delivery',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create table auth.users(id uuid primary key,email text);
   create table public.published_pages(owner_id uuid primary key,slug text,document jsonb,moderated_at timestamptz);
   create table public.contact_messages(id uuid primary key default gen_random_uuid(),owner_id uuid,name text,email text,message text,answers jsonb);
   grant usage on schema public,auth to anon,authenticated,service_role;
   insert into auth.users values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','owner@example.com'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','other@example.com');
   insert into public.published_pages values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','alice','{"profile":{"emailNotifications":true}}',null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','bob','{"profile":{"emailNotifications":false}}',null);`);
  await db.exec(await readFile(new URL('../supabase/migrations/013_contact_notifications.sql',import.meta.url),'utf8'));
  await db.exec(`insert into public.contact_messages(owner_id,name,email,message,answers) values
   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Guest','guest@example.com','Hello','[]'),
   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Guest','guest@example.com','Hello','[]');`);
  assert.equal((await db.query('select count(*)::integer as total from public.contact_notification_outbox')).rows[0].total,1);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from public.contact_notification_outbox'),/permission denied/);
  await assert.rejects(db.query('select * from public.platform_claim_contact_notifications()'),/permission denied/);
  await db.exec('reset role');
  const claimed=(await db.query('select * from public.platform_claim_contact_notifications()')).rows;
  assert.equal(claimed.length,1);assert.equal(claimed[0].recipient,'owner@example.com');
  assert.equal((await db.query('select * from public.platform_claim_contact_notifications()')).rows.length,0);
  assert.equal((await db.query('select public.platform_finish_contact_notification($1,$2,true,null) as done',[claimed[0].message_id,claimed[0].lease_token])).rows[0].done,true);
  assert.equal((await db.query('select state from public.contact_notification_outbox')).rows[0].state,'sent');
 }finally{await db.close()}
});

test('email delivery uses stable idempotency key and keeps submitted text plain',async()=>{
 let request;
 const job={message_id:'cccccccc-cccc-cccc-cccc-cccccccccccc',recipient:'owner@example.com',slug:'alice',name:'Guest',email:'guest@example.com',message:'Hello',answers:[{label:'Question',value:'<script>hello</script>'}]};
 await sendContactNotification(job,{apiKey:'test-key',from:'Verbaspark <test@example.com>',appURL:'https://verbaspark.example',fetcher:async(url,options)=>{request={url,options};return new Response('{"id":"sent"}',{status:200})}});
 assert.equal(request.url,'https://api.resend.com/emails');
 assert.equal(request.options.headers['Idempotency-Key'],'contact/'+job.message_id);
 const payload=JSON.parse(request.options.body);
 assert.equal(payload.to[0],job.recipient);assert.match(payload.text,/Question: <script>hello<\/script>/);
 assert.ok(!Object.hasOwn(payload,'html'));assert.match(payload.text,/https:\/\/verbaspark.example\/editor\//);
});

test('queue worker marks a provider failure for retry without losing the enquiry',async()=>{
 const before={...process.env};process.env.RESEND_API_KEY='test';process.env.CONTACT_EMAIL_FROM='test@example.com';
 const calls=[],job={message_id:'cccccccc-cccc-cccc-cccc-cccccccccccc',lease_token:'dddddddd-dddd-dddd-dddd-dddddddddddd'};
 const db={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='platform_claim_contact_notifications'?[job]:true,error:null}}};
 try{const result=await processContactNotifications(db,{send:async()=>{throw Error('Provider unavailable')}});assert.equal(result.processed,1);assert.equal(result.sent,0);assert.equal(calls[1].args.delivered,false);assert.match(calls[1].args.error_text,/Provider unavailable/)}
 finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}
});

test('section heading survives cleanup and only one visible main action is featured',()=>{
 const section=newBlock('section');assert.equal(section.size,'wide');
 const page=cleanPage({cards:[section,{id:'one',type:'link',title:'One',url:'https://one.example',featured:true},{id:'two',type:'link',title:'Two',url:'https://two.example',featured:true}]});
 assert.equal(page.cards[0].type,'section');assert.equal(page.cards[1].featured,true);assert.equal(page.cards[2].featured,false);
 assert.equal(duplicateBlock(page.cards[1]).featured,false);
});
