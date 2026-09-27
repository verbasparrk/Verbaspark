import {admin,clientHash,limit,fail} from '../server/platform.js';
import {photonSuggestions} from '../server/geocode.js';

export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).end();
 const query=String(req.query?.q||'').trim().replace(/\s+/g,' ');
 if(query.length<3||query.length>120)return res.status(400).json({error:'Enter at least 3 characters of an address or city.'});
 try{
  const db=admin(),hash=clientHash(req);
  if(!await limit(db,'geocode:'+hash,120,3600))return res.status(429).json({error:'Too many searches. Please try again later.'});
  const url='https://photon.komoot.io/api/?'+new URLSearchParams({q:query,limit:'5',lang:'en'});
  const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Verbaspark/1.0 (+https://verbaspark.vercel.app/)'},signal:AbortSignal.timeout(7000)});
  if(!response.ok)throw Object.assign(Error('Address search is temporarily unavailable.'),{status:503});
  const results=photonSuggestions(await response.json());
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({results});
 }catch(error){return fail(res,error)}
}
