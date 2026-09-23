import {contactFormHTML} from './profile-public.js';
export function pageContent(page,cards,interactive,renderCard,esc,language){
 const grid=items=>items.length?'<div class="bento">'+items.map(card=>renderCard(card,interactive)).join('')+'</div>':'';
 if(!page.profile?.contactForm)return grid(cards);
 let position=cards.findIndex(card=>card.id===page.profile.contactBefore);if(position<0)position=cards.length;
 const options=cards.filter(c=>!c.hidden).map(c=>`<option value="${esc(c.id)}" ${page.profile.contactBefore===c.id?'selected':''}>Before ${esc(c.title||'Untitled card')}</option>`).join('');
 const controls=interactive?`<div class="form-placement-controls"><button type="button" class="form-drag-handle" draggable="true" aria-label="Drag contact form">↕ Move form</button><label>Position<select id="contact-position">${options}<option value="" ${position===cards.length?'selected':''}>After all cards</option></select></label><button type="button" id="edit-contact-form">Edit form fields</button></div><p class="hint">Click a field to edit its settings. Drag the handle onto a card to place the form before it.</p>`:'';
 return grid(cards.slice(0,position))+`<div class="placed-contact-form ${interactive?'editing-contact-form':''}">${controls}${contactFormHTML(page,esc,language,interactive)}</div>`+grid(cards.slice(position))+(interactive?'<div class="form-end-drop" data-form-drop-end>Drop form here to place it last</div>':'');
}
export function bindFormPlacement(move,edit){
 const root=document.querySelector('.editing-contact-form');if(!root)return;
 root.querySelector('form').onsubmit=event=>event.preventDefault();
 root.querySelectorAll('form input,form select,form textarea,form button').forEach(el=>{el.tabIndex=-1;el.setAttribute('aria-hidden','true')});
 root.querySelectorAll('[data-edit-contact-field]').forEach(el=>{const open=event=>{event.preventDefault();event.stopPropagation();edit(el.dataset.editContactField)};el.onclick=open;el.onkeydown=event=>{if(event.key==='Enter'||event.key===' ')open(event)}});
 root.querySelector('#contact-position').onchange=event=>move(event.target.value);
 root.querySelector('.form-drag-handle').ondragstart=event=>{event.dataTransfer.setData('application/x-verbaspark-form','1');event.dataTransfer.effectAllowed='move';document.body.classList.add('moving-contact-form')};
 root.querySelector('.form-drag-handle').ondragend=()=>document.body.classList.remove('moving-contact-form');
 document.querySelectorAll('.canvas .card[data-id],.canvas [data-form-drop-end]').forEach(el=>{el.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-verbaspark-form')){event.preventDefault();event.stopImmediatePropagation();event.dataTransfer.dropEffect='move'}},true);el.addEventListener('drop',event=>{if(event.dataTransfer.getData('application/x-verbaspark-form')){event.preventDefault();event.stopImmediatePropagation();document.body.classList.remove('moving-contact-form');move(el.dataset.id||'')}},true)});
}
