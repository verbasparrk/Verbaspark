import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {profileHTML,profileMetadata} from '../server/metadata.js';
import {sitemapXML} from '../api/sitemap.js';
import image from '../api/image.js';

const origin='https://verbaspark.vercel.app';
const page={name:'Ana Novak',profile:{defaultLanguage:'sl',languages:['en'],names:{en:'Ana Novak'},seo:{}},cards:[
 {id:'intro',type:'intro',title:'Fotografinja',body:'Zgodbe v slikah.',translations:{en:{title:'Photographer',body:'Stories in pictures.'}}},
 {id:'photo',type:'photo',title:'Lake',alt:'Lake at dawn',imagePath:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/'+'a'.repeat(64)+'.webp'},
 {id:'hidden',type:'text',title:'Private planning note',hidden:true},
 {id:'link',type:'link',title:'Website',url:'https://ana.example.com'}
]};

test('published profiles expose visible localized content and crawlable images in the initial HTML',()=>{
 const html=profileHTML(page,origin+'/p/ana','en');
 assert.match(html,/<h1>Ana Novak<\/h1>/);assert.match(html,/<h2>Photographer<\/h2>/);assert.match(html,/Stories in pictures/);
 assert.match(html,/alt="Lake at dawn"/);assert.match(html,/\/api\/image\?slug=ana&amp;path=/);assert.match(html,/href="https:\/\/ana.example.com\/"/);
 assert.ok(!html.includes('Private planning note'));
 const hostile=profileHTML({...page,cards:[{type:'text',title:'<script>alert(1)</script>',body:'<img src=x>'}]},origin+'/p/ana','sl');
 assert.ok(!hostile.includes('<script>alert'));assert.ok(!hostile.includes('<img src=x>'));
});

test('language variants have their own canonical URLs, alternates and structured data',()=>{
 const base=origin+'/p/ana',sl=profileMetadata(page,base,'sl'),en=profileMetadata(page,base,'en');
 assert.match(sl,/rel="canonical" href="https:\/\/verbaspark.vercel.app\/p\/ana"/);
 assert.match(en,/rel="canonical" href="https:\/\/verbaspark.vercel.app\/p\/ana\?lang=en"/);
 assert.match(en,/hreflang="sl"/);assert.match(en,/hreflang="en"/);
 const schema=JSON.parse(en.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]);
 assert.equal(schema['@type'],'ProfilePage');assert.equal(schema.mainEntity.name,'Ana Novak');assert.equal(schema.inLanguage,'en');
 const hidden=profileMetadata({...page,profile:{...page.profile,seo:{noindex:true}}},base,'sl');assert.match(hidden,/name="robots" content="noindex,follow"/);
 const company=profileMetadata({...page,profile:{...page.profile,seo:{entityType:'Organization'}}},base,'sl');
 assert.equal(JSON.parse(company.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]).mainEntity['@type'],'Organization');
});

test('sitemap lists only published profiles that permit indexing',()=>{
 const rows=[{slug:'ana',profile:page.profile,published_at:'2026-09-24T00:00:00Z'},{slug:'secret',profile:{seo:{noindex:true}},published_at:'2026-09-24T00:00:00Z'}];
 const xml=sitemapXML(rows,origin);
 assert.match(xml,/<loc>https:\/\/verbaspark.vercel.app\/<\/loc>/);assert.match(xml,/\/p\/ana\?lang=en/);assert.match(xml,/hreflang="sl"/);assert.ok(!xml.includes('/p/secret'));
});

test('marketing page is static and editor is excluded from search',async()=>{
 const [home,editor,robots]=await Promise.all(['../index.html','../editor/index.html','../public/robots.txt'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 assert.match(home,/<h1/);assert.match(home,/href="\/editor\/"/);assert.match(home,/href="\/examples\/photographer\/"/);
 assert.ok(!home.includes('src="/src/main.js"'));assert.match(editor,/name="robots" content="noindex,follow"/);assert.match(robots,/Sitemap: https:\/\/verbaspark.vercel.app\/sitemap.xml/);
});

test('image proxy refuses unreferenced and hidden published assets',async()=>{
 const before={...process.env},originalFetch=globalThis.fetch,owner='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',asset=owner+'/'+'a'.repeat(64)+'.webp';
 const requests=[];Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test-key'});
 globalThis.fetch=async(url)=>{requests.push(new URL(url).pathname);return new Response(JSON.stringify({owner_id:owner,slug:'ana',document:{cards:[{id:'hidden',hidden:true,images:[{imagePath:asset}]}]}}),{status:200,headers:{'Content-Type':'application/json'}})};
 const response=()=>({code:200,setHeader(){},status(code){this.code=code;return this},end(){},send(){}});
 try{
  const res=response();await image({method:'GET',query:{slug:'ana',path:asset}},res);assert.equal(res.code,404);
  assert.ok(!requests.some(path=>path.startsWith('/storage/')));
 }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}
});
