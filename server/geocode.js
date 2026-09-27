import {admin,clientHash,limit,fail} from './platform.js';

export function photonSuggestions(payload){
 const results=[],seen=new Set();
 for(const feature of Array.isArray(payload?.features)?payload.features:[]){
  const [lng,lat]=feature.geometry?.coordinates||[];
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>85)continue;
  const p=feature.properties||{},street=[p.street,p.housenumber].filter(Boolean).join(' ');
  const parts=[street||p.name,p.city||p.town||p.village||p.county,p.country].filter(Boolean).map(value=>String(value).slice(0,100));
  const label=[...new Set(parts)].join(', ').slice(0,240);
  if(!label||seen.has(label))continue;
  seen.add(label);results.push({label,lng,lat});
  if(results.length===5)break;
 }
 return results;
}

export async function handleGeocode(req,res){
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
