const buckets=['page-images','page-files'];
const checked=({data,error})=>{if(error)throw error;return data};

export async function deleteStoredFiles(db,userId){
 let removed=0;
 for(const bucket of buckets){
  const storage=db.storage.from(bucket);
  for(let batch=0;batch<100;batch++){
   const entries=checked(await storage.list(userId,{limit:1000,offset:0}));
   if(!entries?.length)break;
   const paths=entries.filter(entry=>entry.id&&entry.name).map(entry=>userId+'/'+entry.name);
   if(paths.length!==entries.length)throw Error('Nested or invalid storage entries need manual review.');
   checked(await storage.remove(paths));
   removed+=paths.length;
   if(batch===99)throw Error('Too many stored files to delete in one request.');
  }
 }
 return removed;
}
