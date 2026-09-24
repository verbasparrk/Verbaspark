import {admin,body,checked,fail,owner} from '../server/platform.js';

const bad=message=>Object.assign(Error(message),{status:400});
async function administrator(req,db){
 const user=await owner(req,db);
 const row=checked(await db.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle());
 if(!row)throw Object.assign(Error('Administrator access required.'),{status:403});
 return user;
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 try{
  const db=admin(),user=await administrator(req,db);
  if(req.method==='GET'){
   const q=String(req.query?.q||'').trim();
   const status=String(req.query?.status||'all');
   const page=Number(req.query?.page||1);
   if(q.length>80||!['all','live','hidden','draft'].includes(status)||!Number.isInteger(page)||page<1||page>10000)throw bad('Invalid search or page.');
   const [rows,summary,audit]=await Promise.all([
    db.rpc('platform_admin_list',{search_text:q,filter_status:status,skip_rows:(page-1)*25,take_rows:25}),
    db.rpc('platform_admin_summary'),
    db.from('platform_audit').select('id,target_email,slug,action,reason,created_at').order('created_at',{ascending:false}).limit(20)
   ]);
   return res.status(200).json({rows:checked(rows),summary:checked(summary),audit:checked(audit),page});
  }
  const input=body(req),action=input.action,ownerId=input.ownerId,reason=String(input.reason||'').trim();
  if(!['hide','restore'].includes(action)||typeof ownerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)||reason.length<5||reason.length>500)throw bad('Choose an account and give a reason between 5 and 500 characters.');
  checked(await db.rpc('platform_set_moderation',{target_owner:ownerId,make_hidden:action==='hide',note:reason,acting_admin:user.id}));
  return res.status(200).json({ok:true});
 }catch(error){return fail(res,error)}
}
