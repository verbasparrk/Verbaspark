import {admin,body,checked,fail,owner} from '../server/platform.js';
import {submitReport} from '../server/report-submit.js';

async function administrator(req,db){
 const user=await owner(req,db);
 const row=checked(await db.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle());
 if(!row)throw Object.assign(Error('Administrator access required.'),{status:403});
 return user;
}
export default async function handler(req,res){
 if(req.query?.public==='1')return submitReport(req,res);
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 try{
  const db=admin(),user=await administrator(req,db);
  checked(await db.rpc('platform_extensions_ready'));
  if(req.method==='GET'){
   const status=String(req.query?.status||'open');
   if(!['open','reviewed','dismissed'].includes(status))return res.status(400).json({error:'Invalid status.'});
   const rows=checked(await db.from('profile_reports').select('id,owner_id,slug,reason,details,status,created_at,reviewed_at').eq('status',status).order('created_at',{ascending:false}).limit(50));
   return res.status(200).json({rows});
  }
  const input=body(req);
  if(!/^[0-9a-f-]{36}$/i.test(input.id||'')||!['reviewed','dismissed'].includes(input.status))return res.status(400).json({error:'Invalid report action.'});
  const row=checked(await db.from('profile_reports').select('id').eq('id',input.id).eq('status','open').maybeSingle());
  if(!row)return res.status(409).json({error:'This report has already been handled.'});
  checked(await db.from('profile_reports').update({status:input.status,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq('id',input.id).eq('status','open'));
  return res.status(200).json({ok:true});
 }catch(error){return fail(res,error)}
}
