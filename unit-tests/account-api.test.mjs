import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/account.js';

test('account deletion requires authentication, exact confirmation, migration, and a second administrator',async()=>{
 const saved={...process.env},oldFetch=globalThis.fetch,requests=[];
 const userId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 let ready=false,adminCount=1,member=true,storageError=false;
 Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'});
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;requests.push({path,method:options.method,body:options.body});
  if(path==='/auth/v1/user')return json({id:userId,email:'owner@example.com'});
  if(path==='/rest/v1/rpc/platform_deletion_ready')return ready?json(true):json({message:'Missing function',code:'PGRST202'},404);
  if(path==='/rest/v1/platform_admins')return options.method==='HEAD'?new Response(null,{status:200,headers:{'content-range':`0-0/${adminCount}`}}):json(member?{user_id:userId}:null);
  if(path.startsWith('/storage/v1/object/list/'))return storageError?json({message:'Storage unavailable'},500):json([]);
  if(path===`/auth/v1/admin/users/${userId}`)return json({});
  return json({message:'Unknown '+path},404);
 };
 const response=()=>({code:200,setHeader(){},status(code){this.code=code;return this},json(value){this.value=value;return this}});
 const request=(body,token='valid-token')=>({method:'POST',headers:token?{authorization:'Bearer '+token}:{},body});
 const confirmed={action:'delete',confirmEmail:'owner@example.com',confirmPhrase:'DELETE'};
 try{
  let res=response();await handler(request(confirmed,''),res);assert.equal(res.code,401);
  res=response();await handler(request({...confirmed,confirmPhrase:'delete'}),res);assert.equal(res.code,400);
  res=response();await handler(request(confirmed),res);assert.equal(res.code,503);assert.equal(requests.some(r=>r.path.includes('/storage/')),false);
  ready=true;
  res=response();await handler(request(confirmed),res);assert.equal(res.code,409);
  adminCount=2;
  storageError=true;requests.length=0;
  res=response();await handler(request(confirmed),res);assert.equal(res.code,503);
  assert.equal(requests.some(r=>r.path.includes('/admin/users/')),false);
  storageError=false;requests.length=0;
  res=response();await handler(request(confirmed),res);assert.equal(res.code,200);
  assert.deepEqual(requests.filter(r=>r.path.startsWith('/storage/v1/object/list/')).map(r=>r.path),['/storage/v1/object/list/page-images','/storage/v1/object/list/page-files']);
  assert.ok(requests.at(-1).path.endsWith(`/admin/users/${userId}`));
  member=false;
  res=response();await handler(request(confirmed),res);assert.equal(res.code,200);
 }finally{globalThis.fetch=oldFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved)}
});

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})}
