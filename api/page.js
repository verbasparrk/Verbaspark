import {readFile} from 'node:fs/promises';
import {publicReader,published,admin,checked} from '../server/platform.js';
import {profileMetadata,profileHTML,selectedLanguage,escapeScript} from '../server/metadata.js';

export async function renderProfile(req,res,page,url){
 const slug=page.slug,code=selectedLanguage(page.document,req.query?.lang);
 const shell=req.profileShell||await readFile(new URL('../dist/editor/index.html',import.meta.url),'utf8');
 const meta=profileMetadata(page.document,url,code,slug),boot=escapeScript({slug,document:page.document});
 // Keep the server-rendered content available to browsers without JavaScript and
 // search crawlers, but avoid showing a different fallback layout before the
 // interactive profile replaces it. Reveal it if hydration cannot finish.
 const hydration=`<style>html.profile-hydrating #app>.seo-profile{display:none}html.profile-hydrating #app::before{content:'Opening profile…';display:block;min-height:100vh;padding:clamp(20px,5vw,70px);font:600 18px system-ui,sans-serif;color:#17211f;background:#f7f8f4}</style><script>document.documentElement.classList.add('profile-hydrating');window.__profileHydrationTimeout=setTimeout(()=>document.documentElement.classList.remove('profile-hydrating'),20000)</script>`;
 const html=shell.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta name="robots" content="noindex,follow">/,'').replace(/<html lang="[^"]*">/,`<html lang="${code}">`).replace('</head>',meta+hydration+'</head>').replace('<div id="app"></div>',`<div id="app">${profileHTML(page.document,url,code,slug)}</div><script id="public-profile" type="application/json">${boot}</script>`);
 return res.status(200).send(html);
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{
  const slug=req.query.slug,page=await published(publicReader(),slug),origin=new URL(process.env.APP_URL);
  if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Invalid APP_URL');
  let url=origin.origin+'/p/'+encodeURIComponent(slug);
  try{const domain=checked(await admin().from('profile_domains').select('hostname').eq('owner_id',page.owner_id).eq('status','active').maybeSingle());if(domain)url='https://'+domain.hostname+'/'}catch{}
  const host=req.headers?.host?.toLowerCase();
  if(host&&host!==new URL(url).host)res.setHeader('X-Robots-Tag','noindex,follow');
  return await renderProfile(req,res,page,url);
 }catch(error){return res.status(error.status===404?404:503).send(error.status===404?'This page is not published.':'Profile temporarily unavailable. Please try again later.')}
}
