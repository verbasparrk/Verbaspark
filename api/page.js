import {readFile} from 'node:fs/promises';
import {admin,published} from '../server/platform.js';
import {profileMetadata,escapeHTML} from '../server/metadata.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{const slug=req.query.slug,page=await published(admin(),slug),origin=new URL(process.env.APP_URL);if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Invalid APP_URL');
 const shell=req.profileShell||await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),url=origin.origin+'/p/'+encodeURIComponent(slug),meta=profileMetadata(page.document,url,req.query.lang);
 // Published JSON only; a literal '<' can never terminate this script element.
 const boot=JSON.stringify({slug,document:page.document}).replace(/</g,'\\u003c');
 const html=shell.replace(/<title>[\s\S]*?<\/title>/,'').replace('</head>',meta+'</head>').replace('<div id="app"></div>',`<div id="app"></div><script id="public-profile" type="application/json">${boot}</script><noscript><h1>${escapeHTML(page.document.name)}</h1><p>Enable JavaScript to view this profile.</p></noscript>`);
 res.status(200).send(html);
 }catch(error){res.status(error.status===404?404:503).send(error.status===404?'This page is not published.':'Profile temporarily unavailable. Please try again later.')}
}
