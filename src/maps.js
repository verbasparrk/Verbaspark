export function mapEmbedSource(raw){
 const value=String(raw||'').trim();const src=(value.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]||value).replaceAll('&amp;','&');
 try{const u=new URL(src);if(u.protocol!=='https:'||u.username||u.password)return '';
  if(['www.google.com','maps.google.com'].includes(u.hostname)&&u.pathname==='/maps/embed'&&u.searchParams.has('pb'))return u.href;
  if(u.hostname==='www.google.com'&&u.pathname==='/maps/embed/v1/place'&&u.searchParams.has('key')&&u.searchParams.has('q'))return u.href;
  if(u.hostname==='www.openstreetmap.org'&&u.pathname==='/export/embed.html'&&u.searchParams.has('bbox'))return u.href;
 }catch{}return '';
}
export function mapEmbedCoordinates(raw){
 const src=mapEmbedSource(raw);if(!src)return null;
 const url=new URL(src);
 let pair;
 if(url.hostname==='www.openstreetmap.org')pair=url.searchParams.get('marker')?.split(',').map(Number);
 else if(url.pathname==='/maps/embed/v1/place')pair=url.searchParams.get('q')?.split(',').map(Number);
 else {const matches=[...(url.searchParams.get('pb')||'').matchAll(/(?:^|!)3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)(?=!|$)/g)];if(matches.length)pair=matches.at(-1).slice(1).map(Number)}
 if(pair?.length!==2||!Number.isFinite(pair[0])||!Number.isFinite(pair[1])||Math.abs(pair[0])>85||Math.abs(pair[1])>180)return null;
 return [pair[1],pair[0]];
}
export function addressEmbed(address,key=import.meta.env?.VITE_GOOGLE_MAPS_EMBED_KEY){return address?.trim()&&key?'https://www.google.com/maps/embed/v1/place?'+new URLSearchParams({key,q:address.trim()}):''}
export function mapTiles(lng,lat,zoom=14,width=0,height=0){
 const size=2**zoom,x=(Math.min(180,Math.max(-180,Number(lng)))+180)/360*size;
 const radians=Math.min(85,Math.max(-85,Number(lat)))*Math.PI/180;
 const y=(1-Math.asinh(Math.tan(radians))/Math.PI)/2*size;
 const tiles=[];
 const firstX=width>0?Math.floor(x-width/512):Math.floor(x)-1;
 const lastX=width>0?Math.floor(x+width/512):Math.floor(x)+1;
 const firstY=height>0?Math.floor(y-height/512):Math.floor(y)-1;
 const lastY=height>0?Math.floor(y+height/512):Math.floor(y)+1;
 for(let tileY=firstY;tileY<=lastY;tileY++)for(let tileX=firstX;tileX<=lastX;tileX++){
  if(tileY<0||tileY>=size)continue;
  tiles.push({url:`https://tile.openstreetmap.org/${zoom}/${((tileX%size)+size)%size}/${tileY}.png`,left:(tileX-x)*256,top:(tileY-y)*256});
 }
 return tiles;
}
// Also embedded in exported HTML, where module imports are unavailable.
export function mapRuntime(){
 const draw=()=>{
  for(const map of document.querySelectorAll('.static-map[data-map-lng]')){
   const width=map.clientWidth,height=map.clientHeight,viewport=`${width}x${height}`;
   if(!width||!height||map.dataset.mapViewport===viewport)continue;
   const layer=map.querySelector('.static-map-tiles');
   const existing=new Map([...layer.children].map(image=>[image.src,image]));
   const fragment=document.createDocumentFragment();
   for(const tile of mapTiles(Number(map.dataset.mapLng),Number(map.dataset.mapLat),14,width,height)){
    const image=existing.get(tile.url)||document.createElement('img');
    image.src=tile.url;image.alt='';image.loading='lazy';image.decoding='async';image.referrerPolicy='strict-origin-when-cross-origin';
    image.style.left=`calc(50% + ${tile.left}px)`;image.style.top=`calc(50% + ${tile.top}px)`;
    fragment.append(image);
   }
   layer.replaceChildren(fragment);map.dataset.mapViewport=viewport;
  }
 };
 draw();
 if(document.body.dataset.mapRuntime)return;
 document.body.dataset.mapRuntime='true';
 window.addEventListener('resize',()=>requestAnimationFrame(draw));
 new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.static-map')||node.querySelector?.('.static-map')))))requestAnimationFrame(draw);
 }).observe(document.body,{childList:true,subtree:true});
}
export function mapSettings(c,esc){return `<section class="map-settings"><label for="location-address">Search for an address or city</label><div class="map-address-search"><input id="location-address" type="search" value="${esc(c.address||'')}" placeholder="Start typing an address or city" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="map-suggestions" aria-expanded="false"><div id="map-suggestions" class="map-suggestions" role="listbox" hidden></div></div><p id="map-search-status" class="hint" role="status">${c.latitude!=null&&c.latitude!==''&&c.longitude!=null&&c.longitude!==''?'Location selected. The map preview is ready.':'Choose a suggestion to place the pin accurately.'}</p><label>Map display<select id="map-mode"><option value="auto" ${c.mapMode!=='link'?'selected':''}>Map preview</option><option value="link" ${c.mapMode==='link'?'selected':''}>Navigation link only</option></select></label><p class="hint">The profile shows a lightweight map preview. Tapping it opens full navigation.</p><details class="map-advanced" ${c.latitude!==''&&c.latitude!=null?'open':''}><summary>Advanced location options</summary><label>Latitude<input id="location-latitude" type="number" min="-85" max="85" step="any" value="${esc(c.latitude??'')}"></label><label>Longitude<input id="location-longitude" type="number" min="-180" max="180" step="any" value="${esc(c.longitude??'')}"></label><label>Existing map embed<input id="map-embed" value="${esc(c.mapEmbed||'')}" placeholder="Google Maps or OpenStreetMap embed code"></label><p id="map-status" class="hint" role="status">Coordinates or an embed with a location can also place the pin.</p></details></section>`}
export function bindMaps(card,change){
 document.querySelector('#map-mode')?.addEventListener('change',e=>change(()=>card.mapMode=e.target.value));
 document.querySelector('#map-embed')?.addEventListener('change',e=>{const raw=e.target.value,src=mapEmbedSource(raw);if(raw.trim()&&!src){document.querySelector('#map-status').textContent='Paste the Embed a map code, not a regular sharing link. Supported: Google Maps and OpenStreetMap.';return}change(()=>{card.mapEmbed=src;card.latitude='';card.longitude=''})});
 const input=document.querySelector('#location-address'),list=document.querySelector('#map-suggestions'),status=document.querySelector('#map-search-status');
 if(!input||!list)return;
 let timer,controller,options=[],active=-1,chosen=false;
 const close=()=>{list.replaceChildren();list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');options=[];active=-1};
 const select=index=>{const option=options[index];if(!option)return;chosen=true;clearTimeout(timer);controller?.abort();close();change(()=>{card.address=option.label;card.latitude=String(option.lat);card.longitude=String(option.lng);card.mapEmbed=''})};
 const show=items=>{close();options=items;items.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.id=`map-suggestion-${index}`;button.setAttribute('role','option');button.textContent=item.label;button.onpointerdown=event=>event.preventDefault();button.onclick=()=>select(index);list.append(button)});list.hidden=!items.length;input.setAttribute('aria-expanded',String(!!items.length));status.textContent=items.length?'Choose the matching location.':'No matches. Try a fuller address or enter coordinates below.'};
 const highlight=index=>{active=(index+options.length)%options.length;for(const [i,button] of [...list.children].entries())button.setAttribute('aria-selected',String(i===active));input.setAttribute('aria-activedescendant',`map-suggestion-${active}`)};
 input.addEventListener('input',()=>{chosen=false;clearTimeout(timer);controller?.abort();close();const query=input.value.trim();if(query.length<3){status.textContent='Type at least 3 characters to search.';return}status.textContent='Searching addresses…';timer=setTimeout(async()=>{controller=new AbortController();try{const response=await fetch('/api/geocode?'+new URLSearchParams({q:query}),{signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'Search unavailable.');if(input.isConnected&&input.value.trim()===query)show(result.results||[])}catch(error){if(error.name!=='AbortError'&&input.isConnected){close();status.textContent='Address suggestions are unavailable. You can enter coordinates below.'}}},400)});
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){close();return}if(!options.length)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();highlight(active<0?(event.key==='ArrowDown'?0:options.length-1):active+(event.key==='ArrowDown'?1:-1))}else if(event.key==='Enter'){event.preventDefault();select(active<0?0:active)}});
 input.addEventListener('change',()=>{if(chosen)return;clearTimeout(timer);controller?.abort();close();change(()=>{card.address=input.value;card.latitude='';card.longitude='';card.mapEmbed=''})});
 input.addEventListener('blur',()=>setTimeout(close,120));
}
