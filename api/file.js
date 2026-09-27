import {publicReader,published} from '../server/platform.js';
import {fileTypes} from '../src/files.js';

export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{
  const {slug,path}=req.query;
  if(typeof path!=='string'||!/^[a-f0-9-]{36}\/[a-f0-9]{64}\.[a-z0-9]+$/.test(path))return res.status(404).end();
  const db=publicReader(),page=await published(db,slug);
  const file=page.document.cards?.filter(card=>!card.hidden).find(card=>card.file?.path===path)?.file;
  const extension=path.split('.').pop(),mime=fileTypes[extension];
  if(!file||!path.startsWith(page.owner_id+'/')||!mime||file.mime!==mime)return res.status(404).end();
  const {data,error}=await db.storage.from('page-files').createSignedUrl(path,300);
  if(error||!data?.signedUrl)return res.status(404).end();
  // The browser downloads the file from Storage. Vercel Functions cannot
  // return a 20 MiB attachment because their response limit is 4.5 MiB.
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Location',data.signedUrl);
  return res.status(302).end();
 }catch{return res.status(503).end()}
}
