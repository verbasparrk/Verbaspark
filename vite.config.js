import {defineConfig,loadEnv} from 'vite';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 const verification=process.env.GOOGLE_SITE_VERIFICATION||env.GOOGLE_SITE_VERIFICATION||'';
 for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ANALYTICS_HASH_SECRET','APP_URL'])if(env[key])process.env[key]=env[key];
 // Server secrets are never exposed with a VITE_ prefix.
 for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'])if(env[key])process.env[key]=env[key];
 return {build:{rollupOptions:{input:{home:resolve(import.meta.dirname,'index.html'),editor:resolve(import.meta.dirname,'editor/index.html'),admin:resolve(import.meta.dirname,'admin/index.html')}}},plugins:[{name:'search-console-verification',transformIndexHtml(html,context){if(!['/','/index.html'].includes(context.path)||!verification)return html;if(!/^[A-Za-z0-9_-]{10,200}$/.test(verification))throw Error('Invalid GOOGLE_SITE_VERIFICATION value.');return html.replace('</head>',`<meta name="google-site-verification" content="${verification}"></head>`)}},{name:'local-profile-services',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost'),slug=url.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/)?.[1];
  if(/^\/examples\/(photographer|developer|personal)\/$/.test(url.pathname)){req.url=url.pathname+'index.html';return next()}
  const endpoint=['/api/account','/api/admin','/api/contact','/api/event','/api/cover','/api/image','/api/sitemap'].includes(url.pathname)?url.pathname.slice(5):url.pathname==='/sitemap.xml'?'sitemap':slug&&process.env.APP_URL?'page':null;
  if(!endpoint){if(slug)req.url='/editor/';return next()}
  try{
   let input='',size=0;for await(const chunk of req){size+=chunk.length;if(size>16000){res.statusCode=413;res.end('Request too large');return}input+=chunk}req.body=input||undefined;
   req.query={...Object.fromEntries(url.searchParams),...(slug?{slug}:{})};res.status=code=>{res.statusCode=code;return res};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};res.send=value=>res.end(value);
   if(endpoint==='page')req.profileShell=await server.transformIndexHtml('/editor/',await readFile('editor/index.html','utf8'));
   const {default:handler}=await import('./api/'+endpoint+'.js');await handler(req,res);
  }catch{res.statusCode=500;res.end('Service unavailable')}
 })}}, {name:'preview-profile-fallback',configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(/^\/p\/[a-z0-9-]+\/?(?:\?.*)?$/.test(req.url||''))req.url='/editor/';next()})}}]};
});
