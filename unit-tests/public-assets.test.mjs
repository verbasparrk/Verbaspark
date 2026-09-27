import test from 'node:test';
import assert from 'node:assert/strict';
import image from '../api/image.js';

test('public asset routes serve only visible files and showcase images referenced by the published owner',async()=>{
 const before={...process.env},originalFetch=globalThis.fetch;
 const owner='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',filePath=owner+'/'+'b'.repeat(64)+'.pdf',imagePath=owner+'/'+'a'.repeat(64)+'.webp';
 const requests=[];Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test-key'});
 let hidden=false;
 globalThis.fetch=async url=>{
  const path=new URL(url).pathname;requests.push(path);
  if(path==='/rest/v1/published_pages')return Response.json({owner_id:owner,slug:'ana',document:{cards:[{type:'document',hidden,file:{path:filePath,mime:'application/pdf'}}],showcaseCover:{imagePath}}});
  if(path.startsWith('/storage/v1/object/sign/page-files/'))return Response.json({signedURL:'/storage/v1/object/sign/page-files/'+filePath+'?token=test'});
  if(path.startsWith('/storage/v1/object/'))return new Response(new Uint8Array([1,2,3]),{status:200,headers:{'Content-Type':'application/octet-stream'}});
  return Response.json(null);
 };
 const response=()=>({code:200,headers:{},setHeader(key,value){this.headers[key]=value},status(value){this.code=value;return this},send(value){this.value=value;return this},end(){}});
 try{
  let res=response();await image({method:'GET',query:{slug:'ana',path:filePath,kind:'file'}},res);assert.equal(res.code,302);assert.match(res.headers.Location,/storage\/v1\/object\/sign\/page-files/);
  res=response();await image({method:'GET',query:{slug:'ana',path:imagePath}},res);assert.equal(res.code,200);assert.equal(res.headers['Content-Type'],'image/webp');
  const storageCount=requests.filter(path=>path.startsWith('/storage/')).length;
  res=response();await image({method:'GET',query:{slug:'ana',path:owner+'/'+'c'.repeat(64)+'.pdf',kind:'file'}},res);assert.equal(res.code,404);
  hidden=true;res=response();await image({method:'GET',query:{slug:'ana',path:filePath,kind:'file'}},res);assert.equal(res.code,404);
  assert.equal(requests.filter(path=>path.startsWith('/storage/')).length,storageCount);
 }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}
});
