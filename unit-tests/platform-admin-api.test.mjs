import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin.js';

test('admin API verifies a user and server-side membership before any platform data or mutation',async()=>{
 const savedEnv={...process.env},originalFetch=globalThis.fetch,requests=[];
 const id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 let member=false;
 Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'});
 globalThis.fetch=async(url,options)=>{
  const path=new URL(url).pathname;requests.push({path,body:options?.body});
  let result=null;
  if(path==='/auth/v1/user')result={id,email:'admin@example.com'};
  if(path==='/rest/v1/platform_admins')result=member?{user_id:id}:null;
  if(path==='/rest/v1/rpc/platform_admin_list')result=[{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email:'alice@example.com'}];
  if(path==='/rest/v1/rpc/platform_admin_summary')result={accounts:1,live:0,hidden:0,views30d:0,clicks30d:0};
  if(path==='/rest/v1/platform_audit')result=[];
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const response=()=>({code:200,headers:{},setHeader(key,value){this.headers[key]=value},status(code){this.code=code;return this},json(value){this.value=value;return this},end(){}});
 const req=(method,body)=>({method,headers:{authorization:'Bearer valid-token'},query:{page:'1',status:'all'},body});
 try{
  let res=response();await handler({method:'GET',headers:{},query:{}},res);assert.equal(res.code,401);
  res=response();await handler(req('GET'),res);assert.equal(res.code,403);assert.equal(requests.some(r=>r.path.endsWith('platform_admin_list')),false);
  member=true;
  res=response();await handler(req('GET'),res);assert.equal(res.code,200);assert.equal(res.value.rows[0].email,'alice@example.com');assert.equal(res.headers['Cache-Control'],'private, no-store');
  requests.length=0;
  res=response();await handler(req('POST',{action:'hide',ownerId:'bad',reason:'Too short'}),res);assert.equal(res.code,400);assert.equal(requests.some(r=>r.path.endsWith('platform_set_moderation')),false);
  const target='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  res=response();await handler(req('POST',{action:'hide',ownerId:target,reason:'Unsafe public content'}),res);
  assert.equal(res.code,200);
  const mutation=requests.find(r=>r.path.endsWith('platform_set_moderation'));
  assert.deepEqual(JSON.parse(mutation.body),{target_owner:target,make_hidden:true,note:'Unsafe public content',acting_admin:id});
 }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in savedEnv))delete process.env[key];Object.assign(process.env,savedEnv)}
});
