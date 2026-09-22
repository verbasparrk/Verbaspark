import {icon,platformIcon} from './icons.js';
export const linkTypes=[
 {id:'website',name:'Website',hint:'https://your-site.com',type:'link'},
 {id:'instagram',name:'Instagram',hint:'https://www.instagram.com/yourname',type:'link'},
 {id:'linkedin',name:'LinkedIn',hint:'https://www.linkedin.com/in/yourname',type:'link'},
 {id:'github',name:'GitHub',hint:'https://github.com/yourname',type:'link'},
 {id:'spotify',name:'Spotify',hint:'https://open.spotify.com/…',type:'link'},
 {id:'portfolio',name:'Portfolio',hint:'https://your-portfolio.com',type:'project'},
 {id:'youtube',name:'YouTube',hint:'https://www.youtube.com/watch?v=…',type:'video'},
 {id:'video',name:'Other video',hint:'https://vimeo.com/…',type:'video'},
 {id:'email',name:'Email',hint:'hello@example.com',type:'contact'}
];
export function normalizeLink(raw,kind){const value=raw.trim();if(kind==='email'){const address=value.replace(/^mailto:/i,'');if(!/^[^\s@<>?]+@[^\s@<>?]+\.[^\s@<>?]+$/.test(address))throw Error('Enter a valid email address.');return 'mailto:'+address;}
 if(!value)throw Error('Enter a destination for your link.');
 if(/^[a-z][a-z0-9+.-]*:/i.test(value)&&!/^https?:\/\//i.test(value))throw Error('Use an https:// or http:// address.');
 let url;try{url=new URL(/^https?:\/\//i.test(value)?value:'https://'+value)}catch{throw Error('Enter a valid website address.')}
 if(!url.hostname.includes('.')||url.username||url.password)throw Error('Enter a full website address without login details.');return url.href;
}
export function openLinks(add){const dialog=document.createElement('dialog');dialog.className='account-dialog link-dialog';dialog.setAttribute('aria-label','Add a link');let chosen=linkTypes[0];
 dialog.innerHTML='<button class="account-close" aria-label="Close links"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2>Connect your world.</h2><p>Add a website, social profile, video, or email.</p><div class="link-choices">'+linkTypes.map((t,i)=>`<button type="button" data-link-kind="${t.id}" aria-pressed="${i===0}">${platformIcon(t.id==='email'?'mailto:hello@example.com':t.hint.replace('…','example'))}<span>${t.name}</span></button>`).join('')+'</div><form><label>Card title<input name="title" maxlength="100" required value="Website"></label><label id="destination-label">Destination<input name="destination" required placeholder="https://your-site.com" autocomplete="off"></label><label>Short description <span class="hint">(optional)</span><input name="description" maxlength="300" placeholder="What will people find here?"></label><label>Appearance<select name="appearance"><option value="card">Classic card</option><option value="icon">Compact icon</option><option value="wide">Wide link</option></select></label><p class="hint">Opens the destination directly. No account connection required.</p><button class="primary" type="submit">Add to my page <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button><p role="status"></p></form>';
 document.body.append(dialog);dialog.showModal();dialog.querySelector('.account-close').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();const form=dialog.querySelector('form');
 dialog.querySelectorAll('[data-link-kind]').forEach(b=>b.onclick=()=>{const previous=chosen;chosen=linkTypes.find(t=>t.id===b.dataset.linkKind);if(form.elements.title.value===previous.name)form.elements.title.value=chosen.name;form.elements.destination.value='';form.elements.destination.placeholder=chosen.hint;form.elements.destination.type=chosen.id==='email'?'email':'text';form.elements.appearance.closest('label').hidden=chosen.type!=='link';dialog.querySelector('[role=status]').textContent='';dialog.querySelectorAll('[data-link-kind]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)))});
 form.onsubmit=e=>{e.preventDefault();try{const url=normalizeLink(form.elements.destination.value,chosen.id);add({id:crypto.randomUUID(),type:chosen.type,size:chosen.type==='project'||(chosen.type==='link'&&form.elements.appearance.value==='wide')?'wide':'small',linkStyle:form.elements.appearance.value,title:form.elements.title.value.trim()||chosen.name,body:form.elements.description.value.trim(),url});dialog.close()}catch(error){dialog.querySelector('[role=status]').textContent=error.message}};
}
