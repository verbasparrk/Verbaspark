import {admin,body,checked,clientHash,fail,limit,published} from './platform.js';

const reasons=['spam','impersonation','harassment','unsafe','other'];
export async function submitReport(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 try{
  const input=body(req),db=admin(),page=await published(db,input.slug);
  checked(await db.rpc('platform_extensions_ready'));
  if(input.website)return res.status(200).json({ok:true});
  const reason=String(input.reason||''),details=String(input.details||'').trim();
  if(!reasons.includes(reason)||details.length>2000||(reason==='other'&&details.length<10))return res.status(400).json({error:'Choose a reason and add a short explanation for Other.'});
  const hash=clientHash(req);
  if(!await limit(db,'report-global:'+hash,10,86400)||!await limit(db,'report:'+page.owner_id+':'+hash,2,86400))return res.status(429).json({error:'Too many reports. Please try again tomorrow.'});
  checked(await db.from('profile_reports').insert({owner_id:page.owner_id,slug:input.slug,reason,details,reporter_hash:hash}));
  return res.status(200).json({ok:true});
 }catch(error){return fail(res,error)}
}
