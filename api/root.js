import {readFile} from 'node:fs/promises';
import {admin,checked,published} from '../server/platform.js';
import {renderProfile} from './page.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 const host=String(req.headers?.host||'').toLowerCase().replace(/:\d+$/,'');
 let primary='';try{primary=new URL(process.env.APP_URL).hostname}catch{}
 if(!host||host===primary||host==='localhost'||host==='127.0.0.1'||host.endsWith('.vercel.app')){
  try{return res.status(200).send(req.homeShell||await readFile(new URL('../dist/index.html',import.meta.url),'utf8'))}catch{return res.status(503).send('Home page temporarily unavailable.')}
 }
 try{
  const db=admin(),domain=checked(await db.from('profile_domains').select('owner_id').eq('hostname',host).eq('status','active').maybeSingle());
  if(!domain)return res.status(404).send('This domain is not connected to a published profile.');
  const row=checked(await db.from('published_pages').select('slug').eq('owner_id',domain.owner_id).maybeSingle());
  if(!row)return res.status(404).send('This profile is not published.');
  const page=await published(db,row.slug);
  return await renderProfile(req,res,page,'https://'+host+'/');
 }catch(error){return res.status(error.status===404?404:503).send('Profile temporarily unavailable.')}
}
