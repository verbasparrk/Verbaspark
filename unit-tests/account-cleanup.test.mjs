import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteStoredFiles} from '../server/account-cleanup.js';

test('account cleanup removes every object from both private buckets and retries the first page',async()=>{
 const user='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',files={
  'page-images':Array.from({length:1001},(_,i)=>({id:String(i),name:`${i}.webp`})),
  'page-files':[{id:'file',name:'brochure.pdf'}]
 },removed=[];
 const db={storage:{from:bucket=>({
  async list(prefix,options){assert.equal(prefix,user);assert.equal(options.offset,0);return {data:files[bucket].slice(0,options.limit),error:null}},
  async remove(paths){assert.ok(paths.length<=1000);removed.push(...paths.map(path=>`${bucket}/${path}`));files[bucket].splice(0,paths.length);return {data:paths,error:null}}
 })}};
 assert.equal(await deleteStoredFiles(db,user),1002);
 assert.equal(removed.length,1002);
 assert.ok(removed.includes(`page-files/${user}/brochure.pdf`));
 assert.equal(files['page-images'].length,0);
});

test('account cleanup stops on unexpected storage entries without removing another path',async()=>{
 const calls=[];
 const db={storage:{from:()=>({list:async()=>({data:[{name:'folder',id:null}],error:null}),remove:async paths=>{calls.push(paths);return {data:null,error:null}}})}};
 await assert.rejects(deleteStoredFiles(db,'owner'),/manual review/);
 assert.equal(calls.length,0);
});
