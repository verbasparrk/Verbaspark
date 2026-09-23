import {publicReader,published} from '../server/platform.js';

export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{
  const {slug,path}=req.query;if(typeof path!=='string'||!/^[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/.test(path))return res.status(404).end();
  const db=publicReader(),page=await published(db,slug);
  const images=page.document.cards?.filter(card=>!card.hidden).flatMap(card=>[card,...(card.images||[])])||[];
  if(!path.startsWith(page.owner_id+'/')||!images.some(image=>image.imagePath===path))return res.status(404).end();
  const {data,error}=await db.storage.from('page-images').download(path);
  if(error||!data)return res.status(404).end();
  res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');
  res.status(200).send(Buffer.from(await data.arrayBuffer()));
 }catch{res.status(503).end()}
}
