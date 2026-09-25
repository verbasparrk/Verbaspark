export default function handler(req,res){
 res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=3600');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 const primary=new URL(process.env.APP_URL||'https://verbaspark.vercel.app').origin;
 const host=String(req.headers?.host||'').toLowerCase().replace(/:\d+$/,'');
 const origin=host&&host!==new URL(primary).hostname&&!host.endsWith('.vercel.app')?'https://'+host:primary;
 return res.status(200).send(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
}
