import 'maplibre-gl/dist/maplibre-gl.css';

const activeMaps=new Map();
let mapLibrary;

function darkBackground(color){
 const match=color.match(/^#([\da-f]{6})$/i);
 if(!match)return false;
 const [r,g,b]=match[1].match(/../g).map(value=>parseInt(value,16)/255);
 return .2126*r+.7152*g+.0722*b<.48;
}

function fallback(element){
 const link=document.createElement('a');
 link.className='map-unavailable';
 link.href=element.dataset.mapUrl;
 link.target='_blank';
 link.rel='noopener noreferrer';
 link.textContent='Map unavailable here. Open navigation ↗';
 element.replaceChildren(link);
 element.dataset.mapStatus='unavailable';
}

export async function mountCooperativeMaps(){
 for(const [element,map] of activeMaps)if(!element.isConnected){map.remove();activeMaps.delete(element)}
 const elements=[...document.querySelectorAll('[data-cooperative-map]:not([data-map-status])')];
 if(!elements.length)return;
 for(const element of elements)element.dataset.mapStatus='loading';
 try{
  mapLibrary??=import('maplibre-gl');
  const maplibregl=await mapLibrary;
  for(const element of elements){
   if(!element.isConnected)continue;
   const center=[Number(element.dataset.mapLng),Number(element.dataset.mapLat)];
   if(!Number.isFinite(center[0])||!Number.isFinite(center[1])){fallback(element);continue}
   const page=element.closest('.personal-page')||document.documentElement;
   const styles=getComputedStyle(page);
   const dark=darkBackground(styles.getPropertyValue('--page-bg').trim());
   const accent=styles.getPropertyValue('--accent').trim()||'#448aff';
   element.dataset.mapTheme=dark?'dark':'light';
   const loading=element.querySelector('.map-loading');
   try{
    const map=new maplibregl.Map({container:element,style:`https://tiles.openfreemap.org/styles/${dark?'dark':'positron'}`,center,zoom:13,cooperativeGestures:true,dragRotate:false,touchPitch:false});
    activeMaps.set(element,map);
    const marker=document.createElement('div');marker.className='map-pin';marker.style.setProperty('--pin-color',accent);
    new maplibregl.Marker({element:marker,anchor:'bottom'}).setLngLat(center).addTo(map);
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    map.once('load',()=>{if(element.dataset.mapStatus!=='loading')return;loading?.remove();element.dataset.mapStatus='ready'});
    setTimeout(()=>{if(element.isConnected&&element.dataset.mapStatus==='loading'){map.remove();activeMaps.delete(element);fallback(element)}},15000);
   }catch{fallback(element)}
  }
 }catch{for(const element of elements)if(element.isConnected)fallback(element)}
}

document.addEventListener('verbaspark:mount-maps',mountCooperativeMaps);
function watchPage(){
 const root=document.querySelector('#app')||document.body;
 const observer=new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches('[data-cooperative-map]')||node.querySelector('[data-cooperative-map]'))))||[...activeMaps.keys()].some(element=>!element.isConnected))mountCooperativeMaps();
 });
 observer.observe(root,{childList:true,subtree:true});
 mountCooperativeMaps();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchPage,{once:true});else watchPage();
