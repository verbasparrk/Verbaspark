import {icon} from './icons.js';

export const contentGroups=[
 {name:'Introduction',items:[['intro','Introduction','Your name, a short bio, and a main action.','Alex Morgan · Designer'],['text','Text','A story, services, or a short update.','What I’m working on'],['project','Project','Show your work with a link to the details.','Selected project ↗']]},
 {name:'Photos',items:[['photo','Photo','A portrait or a favorite photograph.','Portrait · Cover · Moment'],['gallery','Gallery','A photo grid or a swipeable collection.','A collection of 3–12 photos']]},
 {name:'Documents',items:[['document','Document','Share a CV, price list, or other download.','CV.pdf · Download ↓'],['catalog','Catalog','A PDF with a prominent cover image.','Summer catalog · Open PDF']]},
 {name:'Media',items:[['video','Video','Embed YouTube or Vimeo, or link a video.','▶ Watch my latest video'],['audio','Audio','A playable recording, song, or episode.','▶ Listen · 0:00 ━━━']]},
 {name:'Contact & links',items:[['contact','Contact','Make it easy to get in touch by email.','Let’s connect ↗'],['link','Link','A website, social profile, or favorite page.','Instagram ↗'],['location','Location','An address, map, and navigation link.','Find me · Open navigation ↗']]}
];
export function contentLibrary(){return `<section id="content-library"><div class="library-intro"><h2>Add content</h2><p>Choose a starting point. Make it your own.</p></div><details class="quick-content"><summary>Upload a file or paste a link</summary><label>Upload a document or audio<input id="quick-file" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.mp3,.wav,.ogg,.m4a"></label><label>Or paste a link<input id="quick-url" type="url" placeholder="YouTube, Vimeo, file, or website"></label><button id="quick-add">Add from link</button><p id="quick-status" role="status" class="hint"></p></details>${contentGroups.map(group=>`<section class="content-group"><h3>${group.name}</h3><div class="library-grid">${group.items.map(([type,title,description,example])=>`<button class="content-choice" data-add="${type}"><span class="choice-heading">${icon(type)}<strong>${title}</strong>${icon('plus')}</span><span class="choice-description">${description}</span><span class="choice-example" aria-hidden="true">${example}</span></button>`).join('')}</div></section>`).join('')}</section>`}

export function mountContentLibrary(tab,close){
 if(tab!=='blocks'||matchMedia('(max-width:700px)').matches)return;
 const library=document.querySelector('#content-library');if(!library)return;
 const dialog=document.createElement('dialog');dialog.className='content-dialog';dialog.setAttribute('aria-label','Add content');
 const done=document.createElement('button');done.className='library-close';done.setAttribute('aria-label','Close content library');done.innerHTML=icon('close');done.onclick=close;
 dialog.append(done,library);document.querySelector('#app').append(dialog);dialog.oncancel=e=>{e.preventDefault();close()};dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});dialog.showModal();
}

export function newBlock(type,overrides={}){
 const wide=['intro','project','gallery','catalog','audio','video','location'].includes(type);
 const titles={intro:'Your name',text:'What’s on my mind',project:'My latest project',photo:'A moment worth sharing',gallery:'My gallery',document:'My document',catalog:'My catalog',video:'Watch my latest video',audio:'Listen',contact:'Let’s connect',link:'A favorite link',location:'Find me'};
 return {id:crypto.randomUUID(),type,size:wide?'wide':'small',title:titles[type]||'New block',body:['intro','project','text'].includes(type)?'Click to make this your own.':'',hidden:false,
  ...(['contact','document','link'].includes(type)?{compact:true}:{}),
  ...(['intro','project','link','video'].includes(type)?{url:''}:{}),
  ...(type==='contact'?{url:'mailto:',ctaLabel:'Send an email'}:{}),
  ...(type==='gallery'?{images:[],galleryMode:'grid',galleryGap:8,galleryRadius:12}:{}),
  ...(type==='location'?{address:'',latitude:'',longitude:'',mapMode:'auto'}:{}),
  ...(type==='photo'?{image:'',photoRole:'content'}:{}),...overrides};
}
export function duplicateBlock(card){const copy=structuredClone(card);copy.id=crypto.randomUUID();copy.title=card.title+' (copy)';if(copy.type==='photo')copy.photoRole='content';return copy}
export function publicDocument(state){return {...state,cards:state.cards.filter(c=>c.hidden!==true)}}
