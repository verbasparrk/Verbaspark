import {cleanPage} from './page-data.js';
import {fileTypes} from './files.js';

// Compare visible content, ignoring editor preferences, generated IDs and signed URL expiry.
export async function publicationFingerprint(value,owner){
 const page=cleanPage({...value,cards:value.cards.filter(card=>!card.hidden)});
 delete page.editorTheme;delete page.onboarding;
 const hash=async source=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await (await fetch(source)).arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
 for(const card of page.cards){
  delete card.id;delete card.hidden;
  for(const image of [card,...card.images]){
   if(image.image?.startsWith('data:image/'))image.imagePath=owner+'/'+await hash(image.image)+'.webp';
   if(image.imagePath)delete image.image;
  }
  if(card.file){
   if(card.file.src?.startsWith('data:')){
    const blob=await (await fetch(card.file.src)).blob();
    const ext=Object.keys(fileTypes).find(key=>fileTypes[key]===blob.type);
    card.file.path=owner+'/'+await hash(card.file.src)+'.'+ext;
   }
   if(card.file.path)delete card.file.src;
  }
 }
 const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
 return JSON.stringify(sorted(page));
}
