import {admin,published} from '../server/platform.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{const db=admin(),page=await published(db,req.query.slug),path=page.document.profile?.seo?.imagePath;
  if(!path||!path.startsWith(page.owner_id+'/')||!/^[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/.test(path))return res.status(404).end();
  const {data,error}=await db.storage.from('page-images').download(path);if(error||!data)return res.status(404).end();
  res.setHeader('Content-Type','image/webp');res.status(200).send(Buffer.from(await data.arrayBuffer()));
 }catch{res.status(503).end()}
}
