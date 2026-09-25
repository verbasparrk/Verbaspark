import {admin,body,checked,fail,owner} from '../server/platform.js';
import {cleanupUnused,protectedPaths,storedFiles,storageSummary} from '../server/storage-usage.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 try{
  const db=admin(),user=await owner(req,db);
  checked(await db.rpc('platform_extensions_ready'));
  let cleaned=null;
  if(req.method==='POST'){
   const input=body(req);
   if(input.action!=='cleanup')return res.status(400).json({error:'Unknown action.'});
   const preserve=Array.isArray(input.preserve)?input.preserve:[];
   if(preserve.length>300||preserve.some(key=>typeof key!=='string'||!new RegExp('^page-(images|files):'+user.id+'/[a-zA-Z0-9._-]{1,140}$').test(key)))return res.status(400).json({error:'Invalid protected file list.'});
   cleaned=await cleanupUnused(db,user.id,preserve);
  }
  const [files,protectedSet]=await Promise.all([storedFiles(db,user.id),protectedPaths(db,user.id)]);
  const {eligible,...summary}=storageSummary(files,protectedSet);
  return res.status(200).json({...summary,cleaned});
 }catch(error){return fail(res,error)}
}
