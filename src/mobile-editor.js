import {workspaceSections} from './workspace-navigation.js';
import {icon} from './icons.js';
let panel=null;
const phone=()=>matchMedia('(max-width:700px)').matches;
export function mountMobile({tab,preview,render,setTab}){
 const app=document.querySelector('#app');document.body.classList.toggle('mobile-preview',phone()&&preview);
 if(!phone()){panel=null;return}
 if(preview)panel=null;document.querySelector('#preview').dataset.mobileTool='preview';
 const menu=document.createElement('button');menu.className='mobile-menu-toggle secondary';menu.setAttribute('aria-label','Open page menu');menu.innerHTML=icon('more');document.querySelector('.top-actions').append(menu);
 const close=()=>{panel=null;render()};
 menu.onclick=()=>{panel=panel==='menu'?null:'menu';render()};
 if(!preview){const nav=document.createElement('nav');nav.className='mobile-tools';nav.setAttribute('aria-label','Page editing tools');nav.innerHTML=workspaceSections.map(([id,label,glyph])=>'<button data-mobile-tool="'+id+'">'+icon(glyph)+'<span>'+label+'</span></button>').join('');app.append(nav);nav.querySelectorAll('button').forEach(button=>button.onclick=()=>{const id=button.dataset.mobileTool;if(['blocks','design'].includes(id)){panel='settings';setTab(id);render()}else{panel=null;document.querySelector('#'+id).click()}});
 document.querySelectorAll('.card[draggable]').forEach(card=>card.addEventListener('click',event=>{if(event.target.closest('.resize')||event.target.isContentEditable)return;panel='settings';setTab('edit');queueMicrotask(()=>{if(!document.querySelector('.mobile-sheet[open]'))render()})},true));}
 if(!panel)return;
 const sheet=document.createElement('dialog');sheet.className='mobile-sheet';sheet.setAttribute('aria-label',panel==='menu'?'Page menu':tab==='blocks'?'Add content':tab==='design'?'Page design':'Edit selected card');sheet.innerHTML=`<div class="sheet-header"><span class="sheet-grip"></span><strong>${panel==='menu'?'Your page':tab==='blocks'?'Add content':tab==='design'?'Page design':'Edit card'}</strong><button class="sheet-done">Done</button></div><div class="sheet-content"></div>`;
 app.append(sheet);const content=sheet.querySelector('.sheet-content');
 if(panel==='menu'){
  const actions=[['profile-settings','Profile settings'],['file-library','File library'],['review-page','Review before publishing'],['save-status','Save & recovery'],['account','Account & publishing'],['templates','Explore templates'],['add-link','Add a link'],['export','Export HTML'],['editor-theme','Switch editor theme'],['undo','Undo'],['redo','Redo'],['show-steps','Getting started']];
  for(const [id,label] of actions){const target=document.getElementById(id);const button=document.createElement('button');button.innerHTML=icon({'profile-settings':'design','file-library':'document',inbox:'contact',analytics:'gallery',dashboard:'gallery','review-page':'check','save-status':'history',account:'cloud',templates:'gallery','add-link':'link',export:'download','editor-theme':'design',undo:'undo',redo:'redo','show-steps':'check'}[id])+'<span>'+label+'</span>'; button.disabled=target.disabled;button.onclick=()=>{panel=null;sheet.close();target.click();if(['profile-settings','file-library','inbox','analytics','dashboard','review-page','export','account','templates','add-link','save-status'].includes(id))render()};content.append(button)}
 }else{const sidebar=document.querySelector('.sidebar');content.append(sidebar);sidebar.removeAttribute('aria-hidden');}
 sheet.querySelector('.sheet-done').onclick=close;sheet.oncancel=event=>{event.preventDefault();close()};sheet.addEventListener('click',event=>{if(event.target===sheet)close()});
 const header=sheet.querySelector('.sheet-header');header.onpointerdown=event=>{if(event.target.closest('button'))return;const y=event.clientY;header.setPointerCapture(event.pointerId);header.onpointerup=end=>{if(end.clientY-y>55)close();header.onpointerup=null}};
 sheet.showModal();
}
export function watchMobile(render,setMobile){matchMedia('(max-width:700px)').addEventListener('change',event=>{panel=null;setMobile(event.matches);render()})}
