import {admin,body,checked,fail,owner} from '../server/platform.js';
import {assertHostname,dnsInstructions,domainClaimVerified,projectPath,vercel} from '../server/domains.js';

async function details(host,token,verify=false){
 const path=projectPath(host);
 if(verify)await vercel(path+'/verify','POST').catch(()=>{});
 const domain=await vercel(path),config=await vercel('/v6/domains/'+encodeURIComponent(host)+'/config');
 const claimed=await domainClaimVerified(host,token);
 return {verified:domain.verified===true&&config.misconfigured===false&&claimed,claimed,claimRecord:{type:'TXT',name:'_verbaspark.'+host,value:'verbaspark-verify='+token},...dnsInstructions(config,domain)};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 try{
  const db=admin(),user=await owner(req,db);checked(await db.rpc('platform_extensions_ready'));
  let row=checked(await db.from('profile_domains').select('owner_id,hostname,status,created_at,verified_at,claim_token').eq('owner_id',user.id).maybeSingle());
  if(req.method==='POST'&&!row){
   const hostname=assertHostname(body(req).hostname);
   const existing=checked(await db.from('profile_domains').select('owner_id').eq('hostname',hostname).maybeSingle());
   if(existing)throw Object.assign(Error('This domain is already connected to a Verbaspark profile.'),{status:409});
   const published=checked(await db.from('published_pages').select('slug').eq('owner_id',user.id).maybeSingle());
   if(!published)throw Object.assign(Error('Publish your profile before connecting a domain.'),{status:409});
   await vercel(projectPath(),'POST',{name:hostname});
   try{row=checked(await db.from('profile_domains').insert({owner_id:user.id,hostname}).select('owner_id,hostname,status,created_at,verified_at,claim_token').single())}
   catch(error){await vercel(projectPath(hostname),'DELETE').catch(()=>{});throw error}
  }
  if(req.method==='DELETE'){
   if(!row)return res.status(200).json({ok:true});
   try{await vercel(projectPath(row.hostname),'DELETE')}catch(error){if(error.status!==404)throw error}
   checked(await db.from('profile_domains').delete().eq('owner_id',user.id).eq('hostname',row.hostname));
   return res.status(200).json({ok:true});
  }
  if(!row)return res.status(200).json({domain:null});
  let info=null;
  try{
   info=await details(row.hostname,row.claim_token,req.method==='POST');
   const status=info.verified?'active':'pending';
   if(status!==row.status){checked(await db.from('profile_domains').update({status,verified_at:info.verified?new Date().toISOString():null}).eq('owner_id',user.id));row.status=status}
  }catch(error){if(req.method==='POST')throw error;if(error.status===404&&row.status==='active'){checked(await db.from('profile_domains').update({status:'pending',verified_at:null}).eq('owner_id',user.id));row.status='pending'}info={error:error.message}}
  return res.status(200).json({domain:{hostname:row.hostname,status:row.status,createdAt:row.created_at,...info}});
 }catch(error){return fail(res,error)}
}
