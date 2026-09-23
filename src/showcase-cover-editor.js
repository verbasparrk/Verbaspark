import {cleanShowcaseCover} from './showcase-cover.js';
import {preparePhoto,cropStyle} from './photos.js';
import {openFileLibrary} from './file-library.js';
export function bindShowcaseCover(state,change){
 const source=document.querySelector('#showcase-cover-source');if(!source)return;
 const update=patch=>change(()=>{state.showcaseCover={...cleanShowcaseCover(state.showcaseCover),...patch}});
 source.onchange=()=>update({source:source.value});
 document.querySelector('#showcase-cover-library').onclick=()=>openFileLibrary(state,null,item=>update({source:'library',image:item.image,imagePath:item.imagePath,alt:item.alt}));
 document.querySelector('#showcase-cover-upload').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  const status=document.querySelector('#showcase-cover-status');status.textContent='Preparing image...';
  try{const image=await preparePhoto(file);update({source:'library',image,imagePath:'',alt:file.name})}
  catch(error){status.textContent=error.message}
 };
 for(const input of document.querySelectorAll('[data-showcase-cover]')){
  input.oninput=()=>{
   const key=input.dataset.showcaseCover,value=Number(input.value),settings={...cleanShowcaseCover(state.showcaseCover),[key]:value};
   input.closest('label').querySelector('output').textContent=value+'%';
   const img=document.querySelector('.showcase-page .card.intro .photo-viewport img');if(img)img.style.cssText=cropStyle({crop:settings});
   if(key==='dim')document.querySelector('.showcase-page .card.intro')?.style.setProperty('--cover-overlay',`rgba(0,0,0,${value/100})`);
  };
  input.onchange=()=>update({[input.dataset.showcaseCover]:Number(input.value)});
 }
}
