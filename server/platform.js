import {createClient} from '@supabase/supabase-js';
import {createHmac} from 'node:crypto';
function client(key){const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;if(!url||!key)throw Object.assign(Error('Server setup is incomplete.'),{status:503});return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(12000)})}})}
export function admin(){return client(process.env.SUPABASE_SERVICE_ROLE_KEY)}
export function publicReader(){return client(process.env.VITE_SUPABASE_PUBLISHABLE_KEY)}
export const checked=result=>{if(result.error)throw result.error;return result.data};
export async function owner(req,db){const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token)throw Object.assign(Error('Sign in first.'),{status:401});const {data,error}=await db.auth.getUser(token);if(error||!data.user)throw Object.assign(Error('Sign in again.'),{status:401});return data.user}
export async function published(db,slug){if(!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug||''))throw Object.assign(Error('Page not found.'),{status:404});const row=checked(await db.from('published_pages').select('owner_id,slug,document').eq('slug',slug).maybeSingle());if(!row)throw Object.assign(Error('Page not found.'),{status:404});return row}
export function clientHash(req){const secret=process.env.ANALYTICS_HASH_SECRET;if(!secret)throw Object.assign(Error('Server setup is incomplete.'),{status:503});const ip=req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';return createHmac('sha256',secret).update(String(ip).split(',')[0]+'|'+new Date().toISOString().slice(0,10)).digest('hex')}
export async function limit(db,key,maximum,seconds){return checked(await db.rpc('platform_take_limit',{limit_key:key,maximum,seconds}))}
export function body(req){let value;try{value=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{throw Object.assign(Error('Invalid JSON.'),{status:400})}if(!value||typeof value!=='object'||JSON.stringify(value).length>16000)throw Object.assign(Error('Invalid request.'),{status:400});return value}
export function fail(res,error){const status=error.status||500;res.status(status).json({error:status===500?'Service unavailable. Please try again later.':error.message})}
