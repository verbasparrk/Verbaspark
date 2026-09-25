import {checked} from './platform.js';

export const STORAGE_QUOTA=209715200;
const buckets=['page-images','page-files'];
const minimumAge=30*24*60*60*1000;

export function referencedFiles(document){
 const images=new Set(),files=new Set();
 if(!document||typeof document!=='object')return {images,files};
 for(const card of [...(Array.isArray(document.cards)?document.cards:[]),document.profile?.seo,document.showcaseCover]){
  if(!card)continue;
  for(const item of [card,...(Array.isArray(card.images)?card.images:[])]){
   if(typeof item?.imagePath==='string')images.add(item.imagePath);
   if(typeof item?.file?.path==='string')files.add(item.file.path);
  }
 }
 return {images,files};
}

export async function protectedPaths(db,userId){
 const [draft,published]=await Promise.all([
  db.from('drafts').select('document').eq('owner_id',userId).maybeSingle(),
  db.from('published_pages').select('document').eq('owner_id',userId).maybeSingle()
 ]);
 const protectedSet=new Set();
 for(const document of [checked(draft)?.document,checked(published)?.document]){
  const {images,files}=referencedFiles(document);
  for(const path of images)protectedSet.add('page-images:'+path);
  for(const path of files)protectedSet.add('page-files:'+path);
 }
 return protectedSet;
}

export async function storedFiles(db,userId){
 const items=[];
 for(const bucket of buckets){
  for(let offset=0;offset<10000;offset+=1000){
   const rows=checked(await db.storage.from(bucket).list(userId,{limit:1000,offset,sortBy:{column:'name',order:'asc'}}))||[];
   for(const row of rows){
    if(!row.id||!row.name)continue;
    const path=userId+'/'+row.name;
    const size=Number(row.metadata?.size);
    items.push({bucket,path,size:Number.isSafeInteger(size)&&size>=0?size:0,createdAt:row.created_at||row.updated_at||null});
   }
   if(rows.length<1000)break;
   if(offset===9000)throw Error('Too many stored files to calculate usage safely.');
  }
 }
 return items;
}

export function storageSummary(items,protectedSet,now=Date.now()){
 const eligible=items.filter(item=>!protectedSet.has(item.bucket+':'+item.path)&&item.createdAt&&now-new Date(item.createdAt).getTime()>=minimumAge);
 return {count:items.length,used:items.reduce((n,item)=>n+item.size,0),quota:STORAGE_QUOTA,unusedCount:eligible.length,unusedBytes:eligible.reduce((n,item)=>n+item.size,0),eligible};
}

export async function cleanupUnused(db,userId,extraProtected=[]){
 const items=await storedFiles(db,userId),protectedSet=await protectedPaths(db,userId);
 for(const key of extraProtected)protectedSet.add(key);
 const {eligible}=storageSummary(items,protectedSet);
 let removed=0,bytes=0;
 for(const bucket of buckets){
  const candidates=eligible.filter(item=>item.bucket===bucket);
  for(let i=0;i<candidates.length;i+=100){
   // A new save may have referenced an object since the first read.
   const latest=await protectedPaths(db,userId);
   for(const key of extraProtected)latest.add(key);
   const batch=candidates.slice(i,i+100).filter(item=>!latest.has(bucket+':'+item.path));
   if(!batch.length)continue;
   checked(await db.storage.from(bucket).remove(batch.map(item=>item.path)));
   removed+=batch.length;bytes+=batch.reduce((n,item)=>n+item.size,0);
  }
 }
 return {removed,bytes};
}
