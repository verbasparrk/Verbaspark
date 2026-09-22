import {admin,body,published,clientHash,limit,checked,owner,fail} from '../server/platform.js';
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();try{
 const input=body(req),db=admin(),page=await published(db,input.slug);
 if(!page.document.profile?.analytics||/bot|crawler|spider|preview/i.test(req.headers['user-agent']||'')||req.headers.dnt==='1'||req.headers['sec-gpc']==='1')return res.json({ok:true});
 if(req.headers.authorization){try{if((await owner(req,db)).id===page.owner_id)return res.json({ok:true})}catch{}}
 if(!['view','click'].includes(input.event))return res.status(400).json({error:'Invalid event.'});
 const card=input.event==='click'?String(input.card||''):'';
 if(input.event==='click'&&!page.document.cards.some(c=>c.id===card&&!c.hidden&&(c.url||c.file||c.type==='location'||c.type==='video'||c.type==='audio')))return res.status(400).json({error:'Unknown link.'});
 const hash=clientHash(req),key='metric:'+page.owner_id+':'+hash+':'+input.event+':'+card;
 if(await limit(db,'events:'+hash,300,3600)&&await limit(db,key,1,input.event==='view'?86400:60))checked(await db.rpc('record_profile_metric',{profile_owner:page.owner_id,kind:input.event,card_key:card}));
 res.json({ok:true});
 }catch(error){fail(res,error)}}
