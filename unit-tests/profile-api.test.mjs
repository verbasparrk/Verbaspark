import test from 'node:test';
import assert from 'node:assert/strict';
import contact from '../api/contact.js';
import event from '../api/event.js';
import page from '../api/page.js';
import cover from '../api/cover.js';
const user='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('public endpoints validate, limit, exclude owner analytics and render initial share metadata',async()=>{
 const savedEnv={...process.env},originalFetch=globalThis.fetch,requests=[];let limited=false,contactOn=true;
 Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',ANALYTICS_HASH_SECRET:'test-hash-secret',APP_URL:'https://profiles.example.com'});
 globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname;requests.push({path,body:options?.body});let result;
  if(path==='/rest/v1/published_pages')result={owner_id:user,slug:'alice',document:{name:'Alice',cards:[{id:'intro',type:'intro',title:'Alice',url:'https://example.com'}],profile:{contactForm:contactOn,analytics:true,seo:{title:'Alice portfolio',description:'My work'}}}};
  else if(path==='/rest/v1/rpc/platform_take_limit')result=!limited;
  else if(path==='/auth/v1/user')result={id:user};else result=null;
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const response=()=>({code:200,headers:{},setHeader(key,value){this.headers[key]=value},status(code){this.code=code;return this},json(value){this.value=value;return this},send(value){this.value=value;return this},end(){}});
 const req=body=>({method:'POST',headers:{'x-vercel-forwarded-for':'192.0.2.10'},body});
 try{
  let res=response();await contact(req({slug:'alice',name:'Guest',email:'bad',message:'Hi'}),res);assert.equal(res.code,400);
  res=response();await contact(req({slug:'alice',name:'Guest',email:'guest@example.com',message:'Hi'}),res);assert.equal(res.value.ok,true);assert.ok(requests.some(r=>r.path==='/rest/v1/contact_messages'));
  limited=true;res=response();await contact(req({slug:'alice',name:'Guest',email:'guest@example.com',message:'Hi'}),res);assert.equal(res.code,429);limited=false;
  contactOn=false;res=response();await contact(req({slug:'alice',name:'Guest',email:'guest@example.com',message:'Hi'}),res);assert.equal(res.code,403);
  requests.length=0;res=response();await event({...req({slug:'alice',event:'view'}),headers:{authorization:'Bearer owner-token'}},res);assert.ok(!requests.some(r=>r.path==='/rest/v1/rpc/record_profile_metric'));
  res=response();await event(req({slug:'alice',event:'click',card:'unknown'}),res);assert.equal(res.code,400);
  res=response();await event(req({slug:'alice',event:'click',card:'intro'}),res);assert.ok(requests.some(r=>r.path==='/rest/v1/rpc/record_profile_metric'));
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  res=response();await page({method:'GET',query:{slug:'alice'},profileShell:'<html lang="en"><head><title>App</title><meta name="robots" content="noindex,follow"></head><body><div id="app"></div></body></html>'},res);assert.equal(res.code,200);assert.ok(res.value.includes('property="og:title" content="Alice portfolio"'));assert.ok(res.value.includes('id="public-profile"'));assert.ok(res.value.includes('<h1>Alice</h1>'));assert.ok(res.value.includes('class="seo-profile"'));assert.ok(!res.value.includes('name="robots" content="noindex,follow"'));assert.ok(!res.value.includes('test-service-key'));
  res=response();await cover({method:'GET',query:{slug:'alice'}},res);assert.equal(res.code,404);
 }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in savedEnv))delete process.env[key];Object.assign(process.env,savedEnv)}
});
