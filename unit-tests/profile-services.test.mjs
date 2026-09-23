import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {makeVCard,localizePage,cleanProfile} from '../src/profile-data.js';
import {cleanPage} from '../src/page-data.js';
import {profileMetadata} from '../server/metadata.js';

test('vCard resists field injection and folds UTF-8 lines at 75 bytes',()=>{
 const card=makeVCard({name:'Ana, Novak;\nTEL:evil',address:'Ž'.repeat(100),email:'ana@example.com'});
 assert.ok(card.startsWith('BEGIN:VCARD\r\nVERSION:3.0'));assert.ok(card.includes('FN:Ana\\, Novak\\;\\nTEL:evil'));assert.ok(!card.includes('\r\nTEL:evil'));
 assert.ok(card.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert.ok(card.endsWith('END:VCARD\r\n'));
});
test('profile settings and translations survive cleaning without changing original content',()=>{
 const original={name:'Ana',profile:{defaultLanguage:'en',languages:['sl','bad'],names:{sl:'Ana Novak'},seo:{image:'javascript:alert(1)'},vcard:{enabled:true,name:'Ana'}},cards:[{id:'intro',type:'intro',title:'Hello',body:'Original',translations:{sl:{title:'Pozdrav',body:''},bad:{title:'No'}}}]};
 const page=cleanPage(original);assert.equal(page.cards[0].id,'intro');assert.equal(page.profile.seo.image,'');assert.deepEqual(page.profile.languages,['sl']);assert.equal(localizePage(page,'sl').cards[0].title,'Pozdrav');assert.equal(localizePage(page,'sl').cards[0].body,'Original');assert.equal(page.cards[0].title,'Hello');assert.equal(localizePage(page,'fr').cards[0].title,'Hello');
 assert.equal(cleanProfile(null).contactForm,false);const ids=cleanPage({cards:[{id:'bad id'},{id:'loaded-0'},{id:'loaded-0'}]}).cards.map(c=>c.id);assert.equal(new Set(ids).size,3);
});
test('share metadata is server HTML and safely escapes attribute and tag injection',()=>{
 const html=profileMetadata({name:'<script>bad</script>',cards:[],profile:{seo:{title:'" onload="bad',description:'<img src=x>',image:'https://example.com/image.jpg'}}},'https://example.com/p/ana','en');
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&quot; onload=&quot;bad'));assert.ok(html.includes('property="og:image"'));assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
 const uploaded=profileMetadata({name:'Alice',cards:[],profile:{seo:{imagePath:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/'+'a'.repeat(64)+'.webp'}}},'https://example.com/p/alice','en');assert.ok(uploaded.includes('https://example.com/api/cover?slug=alice'));
});
test('inbox and metrics enforce ownership and public clients cannot submit directly or bypass rate limits',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');`);
 await db.exec(await readFile(new URL('../supabase/migrations/006_profile_services.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/008_contact_fields.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/009_inbox_status.sql',import.meta.url),'utf8'));
 const login=async(role,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role)};
 await login('anon');await assert.rejects(db.query('select * from public.contact_messages'),/permission denied/);await assert.rejects(db.query("select public.platform_take_limit('a',3,60)"),/permission denied/);
 await login('service_role');await db.query("insert into public.contact_messages(owner_id,name,email,message) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Guest','guest@example.com','Hi')");
 const results=await Promise.all(Array.from({length:6},()=>db.query("select public.platform_take_limit('a',3,60) as allowed")));assert.equal(results.filter(r=>r.rows[0].allowed).length,3);
 await db.query("select public.record_profile_metric('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','click','intro')");await db.query("select public.record_profile_metric('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','click','intro')");
 await login('authenticated','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');assert.equal((await db.query('select * from public.contact_messages')).rows.length,0);assert.equal((await db.query('select * from public.profile_metrics')).rows.length,0);await assert.rejects(db.query("select public.record_profile_metric('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','view','')"),/permission denied/);
 await login('authenticated','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');assert.equal((await db.query('select * from public.contact_messages')).rows.length,1);assert.equal((await db.query('select total from public.profile_metrics')).rows[0].total,2);assert.equal((await db.query('select status from public.contact_messages')).rows[0].status,'new');await db.exec("update public.contact_messages set status='read'");await assert.rejects(db.exec("update public.contact_messages set status='invalid'"),/check constraint/);await assert.rejects(db.exec("update public.contact_messages set message='changed'"),/permission denied/);await login('authenticated','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');await db.exec("update public.contact_messages set status='closed'");await login('authenticated','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');assert.equal((await db.query('select status from public.contact_messages')).rows[0].status,'read');await db.exec('delete from public.contact_messages');assert.equal((await db.query('select * from public.contact_messages')).rows.length,0);
 await login('service_role');await db.query("insert into public.contact_messages(owner_id,name,email,message,answers) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Visitor',null,'Form submission',$1)",[JSON.stringify([{id:'service',label:'Service',type:'select',value:'Photo'}])]);await login('authenticated','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');const custom=(await db.query('select email,answers from public.contact_messages')).rows[0];assert.equal(custom.email,null);assert.equal(custom.answers[0].value,'Photo');
 }finally{await db.close()}
});
