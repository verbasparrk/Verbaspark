import {imageSource,cropStyle} from './photos.js';

const fallback={source:'',image:'',imagePath:'',alt:'',x:50,y:50,zoom:100,dim:65};
const position=(value,min,max,otherwise)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):otherwise;
export function cleanShowcaseCover(value={}){
 value=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const source=typeof value.source==='string'&&(/^(?:photo:[a-zA-Z0-9_-]{1,100}|gallery:[a-zA-Z0-9_-]{1,100}:(?:[0-9]|1[01])|library)$/.test(value.source))?value.source:'';
 const image=typeof value.image==='string'&&value.image.length<=6000000&&imageSource(value.image)?value.image:'';
 const imagePath=typeof value.imagePath==='string'&&/^[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/i.test(value.imagePath)?value.imagePath:'';
 return {source,image,imagePath,alt:String(value.alt||'').slice(0,300),x:position(value.x,0,100,50),y:position(value.y,0,100,50),zoom:position(value.zoom,100,200,100),dim:position(value.dim,0,90,65)};
}
export function coverChoices(page){
 const choices=[];
 for(const card of page.cards||[]){if(card.hidden)continue;
  if(card.type==='photo'&&card.image)choices.push({value:`photo:${card.id}`,label:card.title||'Photo',image:card.image,alt:card.alt||card.title});
  if(card.type==='gallery')card.images?.forEach((item,index)=>{if(item.image)choices.push({value:`gallery:${card.id}:${index}`,label:`${card.title||'Gallery'} / ${item.caption||`Image ${index+1}`}`,image:item.image,alt:item.caption||card.title})});
 }
 return choices;
}
export function selectedCover(page){
 const settings=cleanShowcaseCover(page.showcaseCover),choices=coverChoices(page);
 const choice=settings.source==='library'&&settings.image?{image:settings.image,alt:settings.alt}:choices.find(item=>item.value===settings.source)||choices[0];
 return choice?{...choice,crop:{x:settings.x,y:settings.y,zoom:settings.zoom},dim:settings.dim}:null;
}
export function coverPanel(page,esc){
 if(page.layout!=='showcase')return '';
 const settings=cleanShowcaseCover(page.showcaseCover),choices=coverChoices(page),selected=selectedCover(page);
 const options=choices.map(item=>`<option value="${esc(item.value)}" ${settings.source===item.value?'selected':''}>${esc(item.label)}</option>`).join('');
 return `<fieldset class="showcase-cover-settings"><legend>Showcase cover</legend><p class="hint">Choose a photo from this page or your file library. The picture stays on its original card.</p><label>Cover image<select id="showcase-cover-source"><option value="" ${!settings.source?'selected':''}>Automatic: first visible image</option>${options}${settings.image?`<option value="library" ${settings.source==='library'?'selected':''}>Uploaded or library image</option>`:''}</select></label><div class="showcase-cover-actions"><button type="button" id="showcase-cover-library">Choose from file library</button><label>Upload a new image<input type="file" id="showcase-cover-upload" accept="image/jpeg,image/png,image/webp"></label></div><p id="showcase-cover-status" class="hint" role="status">${settings.source&&settings.source!=='library'&&!choices.some(item=>item.value===settings.source)?'Selected photo is unavailable. The first visible photo will be used.':''}</p>${selected?`<div class="showcase-cover-preview"><img src="${esc(imageSource(selected.image))}" alt="${esc(selected.alt||'Cover preview')}" style="${cropStyle({crop:selected.crop})}"><span>Cover preview</span></div>`:'<p class="hint">Add a photo or a gallery image to see a cover.</p>'}${[['x','Horizontal position',0,100],['y','Vertical position',0,100],['zoom','Zoom',100,200],['dim','Darken for text',0,90]].map(([key,label,min,max])=>`<label>${label}<output>${settings[key]}%</output><input data-showcase-cover="${key}" type="range" min="${min}" max="${max}" value="${settings[key]}"></label>`).join('')}</fieldset>`;
}
