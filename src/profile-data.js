import {cleanFields} from './contact-fields.js';
export const languages={en:'English',sl:'Slovenščina',de:'Deutsch',it:'Italiano',hr:'Hrvatski'};
const text=(value,max=1000)=>String(value??'').slice(0,max);
export const httpsURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
export function cleanTranslations(value){return Object.fromEntries(Object.keys(languages).filter(code=>value?.[code]).map(code=>[code,Object.fromEntries(['title','body','subtitle','ctaLabel'].map(key=>[key,text(value[code][key],key==='body'?10000:500)]))]))}
export function cleanProfile(value={}){
 value=value&&typeof value==='object'?value:{};
 const v=value.vcard||{},seo=value.seo||{};
 return {contactSuccess:text(value.contactSuccess,500).trim(),contactBefore:typeof value.contactBefore==='string'?value.contactBefore.slice(0,120):'',contactFields:cleanFields(value.contactFields),contactForm:value.contactForm===true,analytics:value.analytics===true,defaultLanguage:Object.hasOwn(languages,value.defaultLanguage)?value.defaultLanguage:'en',languages:[...new Set((Array.isArray(value.languages)?value.languages:[]).filter(code=>Object.hasOwn(languages,code)))].slice(0,5),names:Object.fromEntries(Object.keys(languages).map(code=>[code,text(value.names?.[code],100)])),seo:{title:text(seo.title,100),description:text(seo.description,300),entityType:seo.entityType==='Organization'?'Organization':'Person',noindex:seo.noindex===true,image:/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(seo.image||'')&&seo.image.length<7000000?seo.image:httpsURL(seo.image),imagePath:/^[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/.test(seo.imagePath||'')?seo.imagePath:''},vcard:{enabled:v.enabled===true,name:text(v.name,100),organization:text(v.organization,200),title:text(v.title,200),email:text(v.email,254),phone:text(v.phone,80),website:httpsURL(v.website),address:text(v.address,500)}};
}
export function localizePage(page,language){const profile=cleanProfile(page.profile),code=[profile.defaultLanguage,...profile.languages].includes(language)?language:profile.defaultLanguage;return {...page,name:profile.names[code]||page.name,cards:page.cards.map(card=>{const t=card.translations?.[code]||{};return {...card,...Object.fromEntries(Object.entries(t).filter(([key,value])=>['title','body','subtitle','ctaLabel'].includes(key)&&value))}})}};
export function makeVCard(value){
 const v=cleanProfile({vcard:value}).vcard;
 const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const lines=['BEGIN:VCARD','VERSION:3.0','FN:'+escape(v.name),'N:;'+escape(v.name)+';;;'];
 for(const [key,val] of [['ORG',v.organization],['TITLE',v.title],['EMAIL;TYPE=INTERNET',v.email],['TEL;TYPE=VOICE',v.phone],['URL',v.website]])if(val)lines.push(key+':'+escape(val));
 if(v.address)lines.push('ADR;TYPE=WORK:;;'+escape(v.address)+';;;;');lines.push('END:VCARD');
 return lines.map(line=>{let out='',length=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(length+size>75){out+='\r\n ';length=1}out+=char;length+=size}return out}).join('\r\n')+'\r\n';
}
