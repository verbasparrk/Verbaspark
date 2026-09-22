import {isClassicHeader} from './business-card.js';
// Preview gestures in the DOM; commit exactly one history entry on release.
export function bindInteractions(state,change,render){
 const grid=document.querySelector('.bento');if(!grid)return;
 const cards=[...grid.querySelectorAll('.card[draggable]')];let moving=null,slot=null,destination=null;
 const fixed=el=>isClassicHeader(state.cards.find(c=>c.id===el.dataset.id),state);
 const clear=()=>{slot?.remove();slot=null;cards.forEach(el=>el.classList.remove('dragging','drop-target'));moving=null;destination=null;};
 const place=(target,event)=>{if(!moving||target===moving)return;const r=target.getBoundingClientRect();const after=event.clientY>r.top+r.height*.65;destination={id:target.dataset.id,after};if(!slot){slot=document.createElement('div');slot.className='placement-preview '+state.cards.find(c=>c.id===moving.dataset.id).size;slot.setAttribute('aria-hidden','true');slot.innerHTML='<span>Drop here</span>';}
 const sibling=after?target.nextElementSibling:target;if(sibling!==slot)grid.insertBefore(slot,sibling);
 };
 cards.forEach(el=>{
  if(fixed(el)){el.draggable=false;el.ondragstart=e=>e.preventDefault();el.ondragover=null;el.ondrop=null;return}
  el.ondragstart=e=>{if(e.target.closest('.resize')){e.preventDefault();return}moving=el;e.dataTransfer.setData('text/plain',el.dataset.id);e.dataTransfer.effectAllowed='move';el.classList.add('dragging');};
  el.ondragover=e=>{if(!moving)return;e.preventDefault();e.dataTransfer.dropEffect='move';place(el,e)};
  el.ondragleave=null;el.ondragend=clear;el.ondrop=null;
 });
 grid.ondragover=e=>{if(moving)e.preventDefault()};
 grid.ondrop=e=>{if(!moving||!destination)return;e.preventDefault();const id=moving.dataset.id,{id:targetId,after}=destination;clear();change(()=>{const from=state.cards.findIndex(c=>c.id===id);const [card]=state.cards.splice(from,1);const to=state.cards.findIndex(c=>c.id===targetId)+(after?1:0);state.cards.splice(to,0,card)})};
 const handle=grid.querySelector('.resize');if(!handle||state.layout==='classic')return;
 handle.title='Drag to resize · arrow keys adjust size';handle.setAttribute('aria-label','Resize selected card');
 handle.onclick=e=>{e.preventDefault();e.stopPropagation()};
 handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const id=handle.closest('.card').dataset.id;change(()=>{state.cards.find(c=>c.id===id).size=e.key==='ArrowRight'?'wide':e.key==='ArrowDown'?'tall':'small'})};
 handle.onpointerdown=e=>{
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();const el=handle.closest('.card');const card=state.cards.find(c=>c.id===el.dataset.id);const original=card.size;const rect=el.getBoundingClientRect();const startX=e.clientX,startY=e.clientY;let size=original;let active=true;
  el.draggable=false;handle.setPointerCapture(e.pointerId);
  const ghost=document.createElement('div');ghost.className='resize-preview';ghost.setAttribute('role','status');ghost.style.cssText=`left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;document.body.append(ghost);
  const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;const gap=Number.parseFloat(getComputedStyle(grid).gap)||16;const unit=(grid.clientWidth-gap*(columns-1))/columns;
  const draw=()=>{ghost.textContent={small:'1 × 1 · Small',wide:'2 × 1 · Wide',tall:'1 × 2 · Tall'}[size];ghost.style.width=(size==='wide'?Math.min(unit*2+gap,grid.clientWidth):unit)+'px';ghost.style.height=(size==='tall'?Math.max(430,rect.height):original==='tall'?210:rect.height)+'px'};
  ghost.textContent='Drag to snap to a card size';
  handle.onpointermove=event=>{const dx=event.clientX-startX,dy=event.clientY-startY;if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;size=Math.abs(dy)>Math.abs(dx)?(dy>40?'tall':dy< -40?'small':original):(dx>40?'wide':dx< -40?'small':original);draw()};
  const finish=cancel=>{if(!active)return;active=false;ghost.remove();el.draggable=true;handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;handle.onlostpointercapture=null;document.removeEventListener('keydown',escape);if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);if(!cancel&&size!==original)change(()=>card.size=size)};
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();finish(true)}};document.addEventListener('keydown',escape);
  handle.onpointerup=()=>finish(false);handle.onpointercancel=()=>finish(true);handle.onlostpointercapture=()=>finish(true);
 };
}
