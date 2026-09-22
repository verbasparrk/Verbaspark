import {admin,body,checked,published,clientHash,limit,fail} from '../server/platform.js';
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();try{
 const input=body(req),db=admin(),page=await published(db,input.slug);
 if(!page.document.profile?.contactForm)return res.status(403).json({error:'This profile is not accepting messages.'});
 if(input.website)return res.status(200).json({ok:true});
 const name=String(input.name||'').trim(),email=String(input.email||'').trim(),message=String(input.message||'').trim();
 if(!name||name.length>100||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!message||message.length>5000)return res.status(400).json({error:'Enter your name, valid email and a message (up to 5,000 characters).'});
 const hash=clientHash(req);if(!await limit(db,'contact-global:'+hash,20,3600)||!await limit(db,'contact:'+page.owner_id+':'+hash,5,3600))return res.status(429).json({error:'Too many messages. Please try again in an hour.'});
 checked(await db.from('contact_messages').insert({owner_id:page.owner_id,name,email,message}));res.json({ok:true});
 }catch(error){fail(res,error)}}
