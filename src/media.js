import {mapEmbedSource,mapEmbedCoordinates,addressEmbed,mapSettings,bindMaps} from './maps.js';
import {icon} from './icons.js';
import {fileTypes,fileSource,prepareFile,bytesLabel,pageFileBytes,PAGE_FILE_LIMIT} from './files.js';
import {imageSource,cropStyle} from './photos.js';

export function videoEmbed(raw){
 try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)return null;const host=u.hostname.replace(/^www\./,'');let id;
  if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];
  if(id&&/^[\w-]{11}$/.test(id))return {provider:'YouTube',url:'https://www.youtube-nocookie.com/embed/'+id};
  if(['vimeo.com','player.vimeo.com'].includes(host)){const match=u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?\/?$/i);if(match){const hash=u.searchParams.get('h')||match[2];return {provider:'Vimeo',url:'https://player.vimeo.com/video/'+match[1]+(hash&&/^[a-f0-9]+$/i.test(hash)?'?h='+hash:'')}}}
 }catch{}return null;
}
export function locationURLs(c){
 const lat=Number(c.latitude),lng=Number(c.longitude),valid=c.latitude!==''&&c.longitude!==''&&c.latitude!=null&&c.longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=85&&Math.abs(lng)<=180;
 const shared=mapEmbedSource(c.mapEmbed);const query=valid?`${lat},${lng}`:String(c.address||'').trim();if(!query&&!shared)return null;
 const coordinates=valid?[lng,lat]:mapEmbedCoordinates(shared);
 return {directions:'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(query),embed:shared||(valid?'https://www.openstreetmap.org/export/embed.html?'+new URLSearchParams({bbox:[Math.max(-180,lng-.015),Math.max(-85,lat-.01),Math.min(180,lng+.015),Math.min(85,lat+.01)].join(','),layer:'mapnik',marker:`${lat},${lng}`}):addressEmbed(c.address)),coordinates};
}
export function mediaHTML(c,esc,interactive,standalone=false){
 const trigger=(kind,src,label,attributes='')=>`<button class="media-launch" data-media="${kind}" data-src="${esc(src)}" data-title="${esc(c.title)}" ${attributes} ${interactive?'tabindex="-1"':''}>${icon(kind==='map'?'location':kind==='audio'?'audio':kind==='pdf'?'document':'video')}<span>${label}</span></button>`;
 if(c.type==='video'){const embed=videoEmbed(c.url);return embed?`<div class="media-frame">${trigger('video',embed.url,'Load '+embed.provider+' player')}</div>`:''}
 if(c.type==='location'){const urls=locationURLs(c),enhanced=!!urls?.coordinates&&!interactive&&!standalone,coords=enhanced?`data-map-lng="${urls.coordinates[0]}" data-map-lat="${urls.coordinates[1]}" data-map-url="${esc(urls.directions)}"`:'';return `<div class="location-address">${icon('location')}<span>${esc(c.address||'Pinned location')}</span></div>${urls?`${urls.embed&&c.mapMode!=='link'?`<div class="media-frame map-frame">${c.mapMode==='click'?trigger('map',urls.embed,'Show map',coords):enhanced?`<div class="cooperative-map" data-cooperative-map ${coords} role="region" aria-label="${esc(c.title||'Location')} map"><span class="map-loading">Loading map…</span></div>`:`<iframe src="${esc(urls.embed)}" title="${esc(c.title||'Location')} map" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups" ${interactive?'tabindex="-1"':''}></iframe><a class="map-touch-fallback" href="${esc(urls.directions)}" target="_blank" rel="noopener noreferrer">Open map in navigation ${icon('arrow')}</a>`}</div>`:''}<a class="media-link" href="${esc(urls.directions)}" target="_blank" rel="noopener noreferrer" ${interactive?'tabindex="-1"':''}>Open navigation ${icon('arrow')}</a>`:'<div class="media-empty">Add an address in block settings.</div>'}`}
 if(!['document','catalog','audio'].includes(c.type))return '';
 const file=c.file,src=fileSource(file?.src),cover=c.type==='catalog'&&imageSource(c.image);
 const slider=c.type==='catalog'&&c.catalogMode==='slider'&&file?.mime==='application/pdf'&&src&&!standalone;
 const pages=slider?`<div class="pdf-catalog" data-pdf-catalog data-src="${esc(src)}" aria-label="${esc(c.title)} pages" tabindex="${interactive?'-1':'0'}"><div class="pdf-catalog-sheet"><canvas role="img" aria-label="Catalog page" hidden></canvas><p class="pdf-catalog-status" role="status">Loading catalog pages…</p></div><div class="pdf-catalog-navigation"><button type="button" data-pdf-step="-1" aria-label="Previous catalog page" disabled ${interactive?'tabindex="-1"':''}>${icon('left')}</button><span class="pdf-catalog-position" aria-live="polite">—</span><button type="button" data-pdf-step="1" aria-label="Next catalog page" disabled ${interactive?'tabindex="-1"':''}>${icon('right')}</button></div></div>`:'';
 return `<div class="file-content">${!slider&&!cover&&c.type==='catalog'&&interactive?'<div class="catalog-cover catalog-cover-empty">'+icon('photo')+'<span>Add a cover photo</span></div>':''}${!slider&&cover?`<div class="catalog-cover"><img src="${esc(cover)}" alt="${esc(c.alt||c.title)}" style="${cropStyle(c)}" loading="lazy"></div>`:''}${pages}${file?`<div class="file-meta">${esc(file.name)}<span>${esc(file.name.split('.').pop().toUpperCase())}${file.size?' · '+bytesLabel(file.size):''}</span></div>`:''}${src?`${c.type==='audio'?`<div class="audio-frame">${trigger('audio',src,'Load audio player')}</div>`:file.mime==='application/pdf'?trigger('pdf',src,slider?'Open full PDF':c.type==='catalog'?'Open catalog':'Preview PDF'):''}<a class="media-link" data-file-download href="${esc(src)}" download="${esc(file.name)}" target="_blank" rel="noopener noreferrer" ${interactive?'tabindex="-1"':''}>Download ${icon('download')}</a>`:`<div class="media-empty">${file?.path?'File unavailable. Reload the page to renew access.':'Upload a file or add its HTTPS link.'}</div>`}</div>`;
}
export function mediaPanel(c,state,esc){
 if(c.type==='video')return `<p class="hint">Paste a YouTube or Vimeo video link. ${videoEmbed(c.url)?'Visitors can load the player here.':'Other video links open on their original website.'}</p>`;
 if(c.type==='location')return mapSettings(c,esc);
 if(c.type==='section')return `<div class="section-pdf-tools"><label class="file-upload-zone">${icon('document')} Add PDF documents below this heading<input id="section-pdf-upload" type="file" accept=".pdf,application/pdf" multiple><small>Select one or several PDFs. Each gets its own preview and download.</small></label><p id="section-pdf-status" role="status" class="hint">PDF only · 20 MB per file · 50 MB per page.</p></div>`;
 if(!['document','catalog','audio'].includes(c.type))return '';
 const extensions=c.type==='audio'?['mp3','wav','ogg','m4a']:c.type==='catalog'?['pdf']:['pdf','docx','xlsx','pptx','txt'];
 return `<div class="file-tools">${c.type==='catalog'?`<label>Catalog display<select id="catalog-mode"><option value="cover" ${c.catalogMode!=='slider'?'selected':''}>Cover and PDF button</option><option value="slider" ${c.catalogMode==='slider'?'selected':''}>Swipe through PDF pages</option></select></label><p class="hint">Visitors can swipe or use arrows to browse the PDF. The full PDF stays available to open or download.</p>`:''}<label class="file-upload-zone">${icon('download')} ${c.file?'Replace file':'Upload '+c.type}<input id="file-upload" type="file" accept="${extensions.map(x=>'.'+x).join(',')}"><small>${extensions.join(', ').toUpperCase()} · up to 20 MB</small></label><p class="hint">Files on this page: ${bytesLabel(pageFileBytes(state))} / ${bytesLabel(PAGE_FILE_LIMIT)}. Browser storage availability may be lower.</p>${c.file?`<p class="hint">${esc(c.file.name)}</p><button id="remove-file">Remove file</button>`:''}<label>Or use a file link<input id="file-url" type="url" placeholder="https://…/file.${extensions[0]}" value="${c.file?.src?.startsWith('https:')?esc(c.file.src):''}"></label><p class="hint">File links must point directly to a supported file.</p><p id="file-status" class="hint" role="status"></p></div>`;
}
export function fileFromURL(raw,type){
 const src=fileSource(raw.trim());if(!src||!src.startsWith('https:'))throw Error('Use a direct HTTPS file link.');const name=decodeURIComponent(new URL(src).pathname.split('/').pop()||'');const mime=fileTypes[name.split('.').pop().toLowerCase()];
 if(!mime)throw Error('The link must end in a supported file extension.');
 if(type==='audio'&&!mime.startsWith('audio/')||type==='catalog'&&mime!=='application/pdf'||type==='document'&&mime.startsWith('audio/'))throw Error('Choose a file that matches this block type.');
 return {name,mime,size:0,src};
}
export function bindMedia(state,selected,change){
 const card=state.cards.find(c=>c.id===selected);if(!card)return;bindMaps(card,change);
 document.querySelector('#catalog-mode')?.addEventListener('change',event=>change(()=>card.catalogMode=event.target.value));
 for(const key of ['address','latitude','longitude'])document.querySelector('#location-'+key)?.addEventListener('change',e=>{if(!e.target.reportValidity())return;change(()=>{card[key]=e.target.value;if(key==='address'){card.latitude='';card.longitude='';card.mapEmbed=''}else card.mapEmbed=''})});
 const status=text=>{const el=document.querySelector('#file-status');if(el)el.textContent=text};
 const upload=async file=>{if(!file)return;status('Reading file…');try{const result=await prepareFile(file,state,card.id);if(!state.cards.includes(card))return;if(card.type==='audio'&&!result.mime.startsWith('audio/')||card.type==='catalog'&&result.mime!=='application/pdf'||card.type==='document'&&result.mime.startsWith('audio/'))throw Error('Choose a file that matches this block type.');change(()=>card.file=result);status('File ready. Saved with your page.')}catch(error){status(error.message)}};
 document.querySelector('#file-upload')?.addEventListener('change',e=>upload(e.target.files[0]));
 const zone=document.querySelector('.file-upload-zone');if(zone){zone.ondragover=e=>e.preventDefault();zone.ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files[0])}}
 document.querySelector('#remove-file')?.addEventListener('click',()=>change(()=>delete card.file));
 document.querySelector('#file-url')?.addEventListener('change',e=>{try{const file=fileFromURL(e.target.value,card.type);change(()=>card.file=file)}catch(error){status(error.message)}});
}

// Self-contained so HTML exports have the same click-to-load behavior.
export function mediaRuntime(){
 if(document.body.dataset.mediaReady)return;document.body.dataset.mediaReady='true';
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-media]');if(!button||button.closest('.card[draggable]'))return;
  const kind=button.dataset.media,src=button.dataset.src,title=button.dataset.title||'Media';
  if(kind==='audio'){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=src;audio.setAttribute('aria-label',title);const error=document.createElement('span');error.className='hint';error.setAttribute('role','status');audio.onerror=()=>error.textContent='Audio could not be loaded. Try the download link.';button.replaceWith(audio,error);audio.focus();return}
  if(kind==='pdf'){
   const dialog=document.createElement('dialog');dialog.className='document-dialog';const header=document.createElement('div');header.className='document-header';const label=document.createElement('strong');label.textContent=title;const close=document.createElement('button');close.textContent='Close';close.setAttribute('aria-label','Close document');header.append(label,close);const fallback=document.createElement('a');fallback.href=src;fallback.textContent='Open or download PDF';fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.download=button.closest('.card')?.querySelector('[data-file-download]')?.download||'document.pdf';
   const frame=document.createElement('iframe');frame.title=title+' PDF preview';frame.setAttribute('sandbox','allow-same-origin allow-scripts allow-downloads');dialog.append(header,fallback,frame);document.body.append(dialog);dialog.showModal();close.focus();let blobURL;
   close.onclick=()=>dialog.close();dialog.onclose=()=>{dialog.remove();if(blobURL)URL.revokeObjectURL(blobURL);button.focus()};
   if(src.startsWith('data:')){try{blobURL=URL.createObjectURL(await (await fetch(src)).blob());if(dialog.isConnected)frame.src=blobURL;else URL.revokeObjectURL(blobURL)}catch{fallback.textContent='Preview unavailable. Download PDF.'}}else frame.src=src;
   return;
  }
  if(kind==='map'&&button.dataset.mapLat&&button.dataset.mapLng){const map=document.createElement('div');map.className='cooperative-map';map.dataset.cooperativeMap='';map.dataset.mapLat=button.dataset.mapLat;map.dataset.mapLng=button.dataset.mapLng;map.dataset.mapUrl=button.dataset.mapUrl;map.setAttribute('role','region');map.setAttribute('aria-label',title+' map');const loading=document.createElement('span');loading.className='map-loading';loading.textContent='Loading map…';map.append(loading);button.replaceWith(map);document.dispatchEvent(new Event('verbaspark:mount-maps'));return}
  try{const url=new URL(src);if(url.protocol!=='https:'||!['www.youtube-nocookie.com','player.vimeo.com','www.openstreetmap.org','www.google.com','maps.google.com'].includes(url.hostname))return}catch{return}
  const frame=document.createElement('iframe');frame.src=src;frame.title=title+(kind==='map'?' map':' video');frame.allow='fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');button.replaceWith(frame);
  if(kind==='map'){const navigation=frame.closest('.location')?.querySelector('.media-link');if(navigation){const fallback=document.createElement('a');fallback.className='map-touch-fallback';fallback.href=navigation.href;fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='Open map in navigation ↗';frame.after(fallback)}}
  frame.focus();
 });
}
