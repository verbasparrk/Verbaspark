import {templates} from './templates.js';
import {preparePhoto} from './photos.js';
import {normalizeLink} from './links.js';
import {cleanPage} from './page-data.js';

const purposes=[['personal','Personal page','Your story and favorite links.'],['portfolio','Portfolio','Show your work and projects.'],['business','Business card','Introduce yourself and make contact easy.']];
const defaults={personal:'personal',portfolio:'professional',business:'business-card'};

export function welcomeDocument({purpose='personal',templateId=defaults[purpose],name,bio='',image='',links=[]}){
 const template=templates.find(t=>t.id===templateId&&[defaults[purpose],'creator','professional'].includes(t.id));
 if(!template||!name?.trim())throw Error('Enter your name to create your page.');
 const cards=[{id:'welcome-intro',type:'intro',size:'wide',title:name.trim(),body:bio.trim()}];
 if(image)cards.push({id:'welcome-photo',type:'photo',size:'small',title:name.trim(),alt:'Portrait of '+name.trim(),image,photoRole:'portrait'});
 for(const link of links){if(!link.url?.trim())continue;const url=normalizeLink(link.url,/^mailto:/i.test(link.url)?'email':'website');cards.push({id:'welcome-link-'+cards.length,type:url.startsWith('mailto:')?'contact':'link',size:'small',title:link.title?.trim()||(url.startsWith('mailto:')?'Email':new URL(url).hostname),url,body:''})}
 return cleanPage({...template,name:name.trim(),cards,onboarding:{name:true,photo:!!image,link:cards.some(c=>c.url)}});
}

export function openWelcome({complete,skip,signIn}){
 let purpose='personal',photo='',photoVersion=0,busy=false;
 const dialog=document.createElement('dialog');dialog.className='account-dialog welcome-dialog';dialog.setAttribute('aria-labelledby','welcome-heading');
 dialog.innerHTML=`<span class="eyebrow">WELCOME TO VERBASPARK</span><h2 id="welcome-heading">Let's make your page.</h2><p class="welcome-intro">Start with your name. You can change the design and add more content whenever you like.</p><form id="welcome-form"><label>Your name<input id="welcome-name" maxlength="100" autocomplete="name" required placeholder="How should your page introduce you?"></label><div class="welcome-first-link"><strong>Your first link <small>Optional</small></strong><div class="welcome-link"><label>Link name<input data-welcome-title="0" maxlength="100" placeholder="My website"></label><label>Destination<input data-welcome-url="0" maxlength="2000" placeholder="https://example.com"></label></div></div><details class="welcome-options"><summary>Personalize your starting page <span>Optional</span></summary><p class="hint">Choose a starting point. You can explore every style later in Design.</p><div class="welcome-choices">${purposes.map(([id,label,description])=>`<button type="button" data-purpose="${id}" aria-pressed="${id===purpose}"><strong>${label}</strong><small>${description}</small></button>`).join('')}</div><label>A short introduction <small>Optional</small><textarea id="welcome-bio" rows="2" maxlength="1000" placeholder="What would you like people to know about you?"></textarea></label><label>Profile photo <small>Optional · JPG, PNG or WebP · up to 15 MB</small><input id="welcome-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="welcome-photo-preview" hidden><img alt="Your profile photo" width="64" height="64"><button id="welcome-remove-photo" type="button">Remove photo</button></div><p id="welcome-photo-status" aria-live="polite"></p></details><p class="hint">Your page starts as a private draft. Publish it when you're ready.</p><p id="welcome-error" role="alert"></p><div class="welcome-navigation"><button type="submit" id="welcome-next" class="primary">Create my page →</button></div></form><div class="welcome-footer"><button id="welcome-skip">Explore the example editor</button><button id="welcome-signin">Already have a page? Sign in</button></div>`;
 document.body.append(dialog);dialog.showModal();const find=s=>dialog.querySelector(s);
 const leave=fn=>{photoVersion++;dialog.close();fn()};dialog.onclose=()=>dialog.remove();dialog.oncancel=e=>{e.preventDefault();leave(skip)};
 find('#welcome-skip').onclick=()=>leave(skip);find('#welcome-signin').onclick=()=>leave(signIn);
 dialog.querySelectorAll('[data-purpose]').forEach(button=>button.onclick=()=>{purpose=button.dataset.purpose;dialog.querySelectorAll('[data-purpose]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))});
 find('#welcome-photo').onchange=async e=>{const file=e.target.files[0];if(!file)return;const version=++photoVersion;busy=true;find('#welcome-next').disabled=true;find('#welcome-photo-status').textContent='Preparing photo…';try{const result=await preparePhoto(file);if(version!==photoVersion||!dialog.isConnected)return;photo=result;find('.welcome-photo-preview img').src=photo;find('.welcome-photo-preview').hidden=false;find('#welcome-photo-status').textContent='Photo ready.'}catch(error){if(version===photoVersion)find('#welcome-photo-status').textContent=error.message}finally{if(version===photoVersion){busy=false;find('#welcome-next').disabled=false}}};
 find('#welcome-remove-photo').onclick=()=>{photoVersion++;photo='';busy=false;find('#welcome-next').disabled=false;find('#welcome-photo').value='';find('.welcome-photo-preview').hidden=true;find('#welcome-photo-status').textContent=''};
 find('#welcome-form').onsubmit=e=>{e.preventDefault();if(busy)return;try{const result=welcomeDocument({purpose,name:find('#welcome-name').value,bio:find('#welcome-bio').value,image:photo,links:[{title:find('[data-welcome-title="0"]').value,url:find('[data-welcome-url="0"]').value}]});complete(result);dialog.close()}catch(error){find('#welcome-error').textContent=error.message}};
 find('#welcome-name').focus();
 return dialog;
}
