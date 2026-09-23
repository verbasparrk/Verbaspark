import {publicReader,checked} from '../server/platform.js';
import {cleanProfile} from '../src/profile-data.js';
import {profileLanguages,languageURL,escapeHTML} from '../server/metadata.js';

export function sitemapXML(rows,origin){
 const entries=[`<url><loc>${escapeHTML(origin+'/')}</loc></url>`];
 for(const row of rows){
  if(!/^[a-z0-9][a-z0-9-]{2,29}$/.test(row.slug)||cleanProfile(row.profile).seo.noindex)continue;
  const page={profile:row.profile},base=origin+'/p/'+encodeURIComponent(row.slug),langs=profileLanguages(page);
  for(const lang of langs){
   const href=languageURL(base,page,lang),lastmod=row.published_at?`<lastmod>${escapeHTML(new Date(row.published_at).toISOString())}</lastmod>`:'';
   const alternates=langs.map(code=>`<xhtml:link rel="alternate" hreflang="${code}" href="${escapeHTML(languageURL(base,page,code))}"/>`).join('');
   entries.push(`<url><loc>${escapeHTML(href)}</loc>${lastmod}${alternates}</url>`);
  }
 }
 return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}

export default async function handler(req,res){
 res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 try{
  const origin=new URL(process.env.APP_URL).origin,db=publicReader(),rows=[];
  for(let offset=0;offset<10000;offset+=1000){
   const batch=checked(await db.from('published_pages').select('slug,published_at,profile:document->profile').order('slug').range(offset,offset+999));
   rows.push(...batch);if(batch.length<1000)break;
  }
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=3600');res.status(200).send(sitemapXML(rows,origin));
 }catch{res.status(503).send('Sitemap temporarily unavailable.')}
}
