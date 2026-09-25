import test from 'node:test';
import assert from 'node:assert/strict';
import report from '../api/reports.js';
import root from '../api/root.js';
import domain from '../api/domain.js';

const owner='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(value){this.value=value;return this},send(value){this.value=value;return this},end(){}});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});

test('report submission validates reason, limits visitors and never exposes report records',async()=>{
 const saved={...process.env},original=globalThis.fetch,requests=[];let limited=false;
 Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',ANALYTICS_HASH_SECRET:'secret'});
 globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname;requests.push({path,body:options.body});
  if(path==='/rest/v1/published_pages')return json({owner_id:owner,slug:'alice',document:{}});
  if(path==='/rest/v1/rpc/platform_extensions_ready')return json(true);
  if(path==='/rest/v1/rpc/platform_take_limit')return json(!limited);
  if(path==='/rest/v1/profile_reports')return json(null);
  return json({message:'Unexpected route'},404);
 };
 try{
  let res=response();await report({method:'POST',query:{public:'1'},headers:{'x-vercel-forwarded-for':'192.0.2.1'},body:{slug:'alice',reason:'unknown'}},res);assert.equal(res.code,400);
  res=response();await report({method:'POST',query:{public:'1'},headers:{'x-vercel-forwarded-for':'192.0.2.1'},body:{slug:'alice',reason:'spam',details:'Suspicious link'}},res);assert.equal(res.value.ok,true);
  const inserted=JSON.parse(requests.find(r=>r.path==='/rest/v1/profile_reports').body);assert.equal(inserted.owner_id,owner);assert.equal(inserted.reason,'spam');assert.equal(inserted.reporter_hash.length,64);
  limited=true;res=response();await report({method:'POST',query:{public:'1'},headers:{'x-vercel-forwarded-for':'192.0.2.1'},body:{slug:'alice',reason:'spam'}},res);assert.equal(res.code,429);
 }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved)}
});

test('custom host root renders its active published profile with a self-canonical URL',async()=>{
 const saved={...process.env},original=globalThis.fetch;
 Object.assign(process.env,{APP_URL:'https://verbaspark.vercel.app',SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'});
 globalThis.fetch=async url=>{const path=new URL(url).pathname;
  if(path==='/rest/v1/profile_domains')return json({owner_id:owner});
  if(path==='/rest/v1/published_pages')return json({owner_id:owner,slug:'alice',document:{name:'Alice',cards:[{id:'intro',type:'intro',title:'Hello'}]}});
  return json(null);
 };
 try{
  const res=response();await root({method:'GET',headers:{host:'alice.example.com'},query:{},profileShell:'<html lang="en"><head><title>Editor</title></head><body><div id="app"></div></body></html>'},res);
  assert.equal(res.code,200);assert.match(res.value,/rel="canonical" href="https:\/\/alice.example.com\/"/);assert.match(res.value,/id="public-profile"/);assert.match(res.value,/api\/image\?slug=alice|Alice/);
 }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved)}
});

test('primary host still serves the marketing home page',async()=>{
 const previous=process.env.APP_URL;process.env.APP_URL='https://verbaspark.vercel.app';
 try{const res=response();await root({method:'GET',headers:{host:'verbaspark.vercel.app'},homeShell:'<html><title>Verbaspark home</title></html>'},res);assert.equal(res.code,200);assert.match(res.value,/Verbaspark home/)}finally{if(previous===undefined)delete process.env.APP_URL;else process.env.APP_URL=previous}
});

test('a signed-in owner can add a domain, see DNS instructions, and activate it after verification',async()=>{
 const saved={...process.env},original=globalThis.fetch,calls=[];let current=null,configured=false;
 Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',VERCEL_API_TOKEN:'server-only-token',VERCEL_PROJECT_ID:'verbaspark',VERCEL_TEAM_ID:'team_test'});
 globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname,method=options.method||'GET';calls.push({path,method,url:String(url)});
  if(path==='/auth/v1/user')return json({id:owner});
  if(path==='/rest/v1/rpc/platform_extensions_ready')return json(true);
  if(path==='/rest/v1/profile_domains'){
   if(method==='POST'){current={owner_id:owner,hostname:'alice.example.com',claim_token:'11111111-1111-4111-8111-111111111111',status:'pending',created_at:'2026-09-25'};return json(current,201)}
   if(method==='PATCH'){current={...current,status:'active'};return json(null)}
   return json(current);
  }
  if(path==='/rest/v1/published_pages')return json({slug:'alice'});
  if(path==='/v9/projects/verbaspark/domains')return json({verified:false});
  if(path==='/v9/projects/verbaspark/domains/alice.example.com/verify')return json({verified:configured});
  if(path==='/v9/projects/verbaspark/domains/alice.example.com')return json({verified:configured,verification:configured?[]:[{type:'TXT',domain:'_vercel.alice.example.com',value:'challenge'}]});
  if(path==='/v6/domains/alice.example.com/config')return json({misconfigured:!configured,recommendedCNAME:[{value:'cname.vercel-dns.com'}]});
  return json({message:'Unexpected route '+path},404);
 };
 try{
  let res=response();await domain({method:'POST',headers:{authorization:'Bearer token'},body:{hostname:'alice.example.com'}},res);
  assert.equal(res.code,200,JSON.stringify({value:res.value,calls}));assert.equal(res.value.domain.status,'pending');assert.equal(res.value.domain.records[0].value,'cname.vercel-dns.com');
  configured=true;res=response();await domain({method:'POST',headers:{authorization:'Bearer token'},body:{}},res);assert.equal(res.value.domain.status,'pending');assert.equal(res.value.domain.claimed,false);
  assert.ok(calls.some(call=>call.url.includes('teamId=team_test')));
 }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved)}
});
