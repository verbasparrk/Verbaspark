import {resolveTxt} from 'node:dns/promises';
const bad=message=>Object.assign(Error(message),{status:400});

export function validHostname(input){
 if(typeof input!=='string')return '';
 const host=input.trim().toLowerCase().replace(/\.$/,'');
 if(host.length<4||host.length>253||!host.includes('.')||host.includes('..')||host.endsWith('.vercel.app')||host.endsWith('.chatgpt.site')||host.endsWith('.supabase.co'))return '';
 const labels=host.split('.');
 if(labels.some(label=>label.length>63||!matchesLabel(label))||labels.at(-1).length<2||/^[0-9.]+$/.test(host))return '';
 return host;
}
function matchesLabel(label){return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)}

function endpoint(path){
 const token=process.env.VERCEL_API_TOKEN,project=process.env.VERCEL_PROJECT_ID;
 if(!token||!project)throw Object.assign(Error('Custom domains are not configured yet.'),{status:503});
 const url=new URL('https://api.vercel.com'+path);
 if(process.env.VERCEL_TEAM_ID)url.searchParams.set('teamId',process.env.VERCEL_TEAM_ID);
 return {url,token};
}
export async function vercel(path,method='GET',payload){
 const {url,token}=endpoint(path);
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(Error(data.error?.message||'Vercel domain request failed.'),{status:[404,409,429].includes(response.status)?response.status:502});
 return data;
}
export function projectPath(host){
 const project=process.env.VERCEL_PROJECT_ID;
 if(!project)throw Object.assign(Error('Custom domains are not configured yet.'),{status:503});
 return '/v9/projects/'+encodeURIComponent(project)+'/domains'+(host?'/'+encodeURIComponent(host):'');
}
export function dnsInstructions(config,projectDomain){
 const records=[];
 for(const [type,values] of [['A',config.recommendedIPv4],['CNAME',config.recommendedCNAME]]){
  for(const value of Array.isArray(values)?values:values?[values]:[]){const target=typeof value==='string'?value:value?.value||value?.record||value?.target;if(target)records.push({type,value:target})}
 }
 const verification=Array.isArray(projectDomain.verification)?projectDomain.verification.map(item=>({type:item.type,name:item.domain,value:item.value})):[];
 return {records,verification,misconfigured:config.misconfigured===true};
}
export function assertHostname(input){const host=validHostname(input);if(!host)throw bad('Enter a valid domain or subdomain without https:// or a path.');return host}

export async function domainClaimVerified(host,token,resolver=resolveTxt){
 if(!validHostname(host)||!String(token||'').match(/^[0-9a-f-]{36}$/i))return false;
 let timer;
 try{const records=await Promise.race([resolver('_verbaspark.'+host),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS timeout')),5000)})]);return records.some(parts=>parts.join('').trim().toLowerCase()==='verbaspark-verify='+String(token).toLowerCase())}catch{return false}finally{clearTimeout(timer)}
}
