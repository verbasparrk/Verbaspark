import {cleanProfile,httpsURL,localizePage} from '../src/profile-data.js';

export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const escapeScript=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const safeColor=(value,fallback)=>/^#[a-f0-9]{6}$/i.test(value||'')?value:fallback;
const safeLink=value=>httpsURL(value)||(/^mailto:[^\s<>"']+$/i.test(value||'')?value:'');
export function profileLanguages(page){const profile=cleanProfile(page.profile);return [profile.defaultLanguage,...profile.languages.filter(code=>code!==profile.defaultLanguage)]}
export function selectedLanguage(page,language){const codes=profileLanguages(page);return codes.includes(language)?language:codes[0]}
export function languageURL(url,page,language){const selected=selectedLanguage(page,language),base=profileLanguages(page)[0];return selected===base?url:url+'?lang='+encodeURIComponent(selected)}

export function profileImageURL(page,slug,image,origin){
 if(image?.imagePath&&/^[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/.test(image.imagePath))return origin+'/api/image?slug='+encodeURIComponent(slug)+'&path='+encodeURIComponent(image.imagePath);
 return httpsURL(image?.image);
}

export function profileMetadata(page,url,language){
 const profile=cleanProfile(page.profile),code=selectedLanguage(page,language),localized=localizePage(page,code),defaultLanguage=profile.defaultLanguage;
 const slug=new URL(url).pathname.split('/').filter(Boolean).at(-1),origin=new URL(url).origin,canonical=languageURL(url,page,code);
 const title=(code===defaultLanguage&&profile.seo.title)||localized.name;
 const description=((code===defaultLanguage&&profile.seo.description)||localized.cards.find(c=>c.type==='intro'&&!c.hidden)?.body||'').replace(/\s+/g,' ').trim();
 const portrait=localized.cards.find(c=>!c.hidden&&c.type==='photo'&&c.photoRole==='portrait')||localized.cards.find(c=>!c.hidden&&c.type==='photo');
 const personImage=portrait?profileImageURL(page,slug,portrait,origin):'';
 const image=(profile.seo.imagePath?origin+'/api/cover?slug='+encodeURIComponent(slug):httpsURL(profile.seo.image))||personImage||origin+'/og-verbaspark.png';
 const alternates=profileLanguages(page).map(lang=>`<link rel="alternate" hreflang="${lang}" href="${escapeHTML(languageURL(url,page,lang))}">`).join('');
 const external=[...new Set(localized.cards.filter(c=>!c.hidden&&c.type==='link').map(c=>httpsURL(c.url)).filter(Boolean))].slice(0,20);
 const person={"@type":"Person",name:localized.name,url:canonical,...(description?{description}:{}),...(personImage?{image:personImage}:{}),...(external.length?{sameAs:external}:{})};
 const schema={"@context":"https://schema.org","@type":"ProfilePage",url:canonical,inLanguage:code,mainEntity:person};
 return `<title>${escapeHTML(title)} — Verbaspark</title><meta name="description" content="${escapeHTML(description)}"><link rel="canonical" href="${escapeHTML(canonical)}">${alternates}<link rel="alternate" hreflang="x-default" href="${escapeHTML(url)}">${profile.seo.noindex?'<meta name="robots" content="noindex,follow">':''}<meta property="og:type" content="profile"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${escapeHTML(canonical)}"><meta property="og:locale" content="${code}"><meta name="twitter:card" content="${image?'summary_large_image':'summary'}">${image?`<meta property="og:image" content="${escapeHTML(image)}"><meta name="twitter:image" content="${escapeHTML(image)}">`:''}<script type="application/ld+json">${escapeScript(schema)}</script>`;
}

export function profileHTML(page,url,language){
 const code=selectedLanguage(page,language),localized=localizePage(page,code),origin=new URL(url).origin,slug=new URL(url).pathname.split('/').filter(Boolean).at(-1);
 const design=page.design||{},bg=safeColor(design.background,'#f7f8f4'),surface=safeColor(design.surface,'#ffffff'),ink=safeColor(design.text,'#17211f'),muted=safeColor(design.muted,'#576861'),border=safeColor(design.border,'#dce4dd'),accent=safeColor(page.accent,'#159979');
 let imageCount=0;
 const imageHTML=(image,alt)=>{const src=profileImageURL(page,slug,image,origin);if(!src)return '';const first=imageCount++===0;return `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt||'')}" ${first?'fetchpriority="high"':'loading="lazy"'} decoding="async">`};
 const cards=localized.cards.filter(c=>!c.hidden).map(card=>{
  const heading=card.title||card.type[0].toUpperCase()+card.type.slice(1),body=card.body?`<p>${escapeHTML(card.body).replace(/\r?\n/g,'<br>')}</p>`:'';
  const images=card.type==='gallery'?(card.images||[]).map(item=>`<figure>${imageHTML(item,item.caption||heading)}${item.caption?`<figcaption>${escapeHTML(item.caption)}</figcaption>`:''}</figure>`).join(''):imageHTML(card,card.alt||heading);
  const href=safeLink(card.url),link=href?`<a href="${escapeHTML(href)}" rel="${href.startsWith('https:')?'ugc noopener noreferrer':'noopener'}">${escapeHTML(card.ctaLabel||'Visit link')} ↗</a>`:'';
  return `<section class="seo-card"><h2>${escapeHTML(heading)}</h2>${card.subtitle?`<p class="seo-subtitle">${escapeHTML(card.subtitle)}</p>`:''}${body}${images?`<div class="seo-images">${images}</div>`:''}${link}</section>`;
 }).join('');
 const css=`<style>.seo-profile{--seo-bg:${bg};--seo-surface:${surface};--seo-ink:${ink};--seo-muted:${muted};--seo-border:${border};--seo-accent:${accent};font-family:system-ui,sans-serif;background:var(--seo-bg);color:var(--seo-ink);min-height:100vh;padding:clamp(20px,5vw,70px)}.seo-profile *{box-sizing:border-box}.seo-inner{max-width:1080px;margin:auto}.seo-profile header{padding:12px 0 38px;border-bottom:1px solid var(--seo-border);font-weight:700}.seo-profile h1{font-size:clamp(42px,6vw,80px);line-height:1.05;letter-spacing:-.055em;margin:58px 0 36px}.seo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.seo-card{background:var(--seo-surface);border:1px solid var(--seo-border);border-radius:14px;padding:clamp(20px,3vw,32px);overflow:hidden}.seo-card h2{font-size:clamp(24px,3vw,38px);line-height:1.13;margin:0 0 14px}.seo-card p{color:var(--seo-muted);line-height:1.55;white-space:normal}.seo-card .seo-subtitle{color:var(--seo-accent)}.seo-card a{display:inline-block;color:var(--seo-accent);margin-top:12px}.seo-images{display:flex;gap:10px;overflow:auto}.seo-images img{max-width:100%;max-height:460px;object-fit:cover;border-radius:9px}.seo-images figure{margin:0;min-width:45%}.seo-images figcaption{font-size:13px;color:var(--seo-muted);margin-top:8px}@media(max-width:680px){.seo-grid{grid-template-columns:1fr}.seo-images figure{min-width:80%}}</style>`;
 return css+`<main class="seo-profile" lang="${code}"><div class="seo-inner"><header>✦ Verbaspark / ${escapeHTML(localized.name)}</header><h1>${escapeHTML(localized.name)}</h1><div class="seo-grid">${cards}</div></div></main>`;
}
