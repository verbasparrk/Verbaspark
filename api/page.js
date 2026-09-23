import {readFile} from 'node:fs/promises';
import {publicReader,published} from '../server/platform.js';
import {profileMetadata,profileHTML,selectedLanguage,escapeScript} from '../server/metadata.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{const slug=req.query.slug,page=await published(publicReader(),slug),origin=new URL(process.env.APP_URL);if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Invalid APP_URL');
 const code=selectedLanguage(page.document,req.query.lang),shell=req.profileShell||await readFile(new URL('../dist/editor/index.html',import.meta.url),'utf8'),url=origin.origin+'/p/'+encodeURIComponent(slug),meta=profileMetadata(page.document,url,code);
 const host=req.headers?.host;if(host&&host!==origin.host)res.setHeader('X-Robots-Tag','noindex,follow');
 const boot=escapeScript({slug,document:page.document});
 const html=shell.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta name="robots" content="noindex,follow">/,'').replace(/<html lang="[^"]*">/,`<html lang="${code}">`).replace('</head>',meta+'</head>').replace('<div id="app"></div>',`<div id="app">${profileHTML(page.document,url,code)}</div><script id="public-profile" type="application/json">${boot}</script>`);
 res.status(200).send(html);
 }catch(error){res.status(error.status===404?404:503).send(error.status===404?'This page is not published.':'Profile temporarily unavailable. Please try again later.')}
}
