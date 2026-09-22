import {defineConfig,loadEnv} from 'vite';
import {readFile} from 'node:fs/promises';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ANALYTICS_HASH_SECRET','APP_URL'])if(env[key])process.env[key]=env[key];
 // These variables are public by design; server secrets never receive a VITE_ prefix.
 for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'])if(env[key])process.env[key]=env[key];
 return {plugins:[{name:'local-profile-services',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost'),slug=url.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/)?.[1];
  const endpoint=['/api/contact','/api/event','/api/cover'].includes(url.pathname)?url.pathname.slice(5):slug&&process.env.APP_URL?'page':null;
  if(!endpoint)return next();
  try{let input='',size=0;for await(const chunk of req){size+=chunk.length;if(size>16000){res.statusCode=413;res.end('Request too large');return}input+=chunk}req.body=input||undefined;req.query={...Object.fromEntries(url.searchParams),...(slug?{slug}:{})};res.status=code=>{res.statusCode=code;return res};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};res.send=value=>res.end(value);
   if(endpoint==='page')req.profileShell=await server.transformIndexHtml(req.url,await readFile('index.html','utf8'));
   const {default:handler}=await import('./api/'+endpoint+'.js');await handler(req,res);
  }catch{res.statusCode=500;res.end('Service unavailable')}
 })}}]};
});
