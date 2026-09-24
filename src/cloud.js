import {fileTypes,fileSource} from './files.js';
import {createClient} from '@supabase/supabase-js';
import {openAccountData} from './account-data.js';
import {normalizeSlug,validSlug} from './slug.js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
async function boundedFetch(input,options={}){const controller=new AbortController();const cancel=()=>controller.abort();if(options.signal?.aborted)cancel();else options.signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,25000);try{return await fetch(input,{...options,signal:controller.signal})}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel)}}
export const cloud=url&&key?createClient(url,key,{global:{fetch:boundedFetch}}):null;
const check=({data,error})=>{if(error)throw error;return data};
const cache=new Map();
export async function saveDraft(document,{userId,revision,requestId}){
 if(!cloud)throw Error('Connect Supabase first.');const {user}=check(await cloud.auth.getUser());if(!user||user.id!==userId)throw Error('Account changed. Sign in again before saving.');
 const copy=structuredClone(document);
 for(const card of copy.cards){const file=card.file;if(!file)continue;
  if(file.src?.startsWith('data:')){
   if(!fileSource(file.src))throw Error('Unsupported file data. Replace the attachment.');
   const blob=await(await fetch(file.src)).blob();const ext=Object.keys(fileTypes).find(key=>fileTypes[key]===blob.type);if(!ext)throw Error('Unsupported file type.');
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');const path=user.id+'/'+hash+'.'+ext;
   if(!cache.has('files:'+path)){const result=await cloud.storage.from('page-files').upload(path,blob,{contentType:blob.type});if(result.error&&String(result.error.statusCode)!=='409')throw Error('File upload failed. Check your connection and the page-files storage setup. '+result.error.message);cache.set('files:'+path,true)}file.path=path;delete file.src;
  }else if(file.path)delete file.src;
 }

 for(const card of [...copy.cards.flatMap(c=>[c,...(c.images||[])]),...(copy.profile?.seo?[copy.profile.seo]:[]),...(copy.showcaseCover?[copy.showcaseCover]:[])]){
  if(card.image?.startsWith('data:image/')){const blob=await(await fetch(card.image)).blob();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');const path=`${user.id}/${hash}.webp`;
   if(!cache.has(path)){const result=await cloud.storage.from('page-images').upload(path,blob,{contentType:blob.type});if(result.error&&String(result.error.statusCode)!=='409')throw result.error;cache.set(path,true)}card.imagePath=path;delete card.image;
  }else if(card.imagePath){delete card.image;}
 }
 const current=check(await cloud.auth.getUser()).user;if(current?.id!==userId)throw Error('Account changed.');
 return check(await cloud.rpc('save_draft',{draft_document:copy,expected_revision:revision,request_id:requestId,expected_owner:userId}));
}
export async function resolveImages(document){for(const c of [...(document.cards||[]).flatMap(c=>[c,...(c.images||[])]),...(document.profile?.seo?[document.profile.seo]:[]),...(document.showcaseCover?[document.showcaseCover]:[])]){if(c.imagePath){const result=await cloud.storage.from('page-images').createSignedUrl(c.imagePath,3600);c.image=result.data?.signedUrl||''}if(c.file?.path){const result=await cloud.storage.from('page-files').createSignedUrl(c.file.path,3600);c.file.src=result.data?.signedUrl||''}}return document;}
export async function exportImages(document){const copy=structuredClone(document);for(const card of [...copy.cards.flatMap(c=>[c,...(c.images||[])]),...(copy.profile?.seo?[copy.profile.seo]:[]),...(copy.showcaseCover?[copy.showcaseCover]:[])]){
 for(const [object,pathKey,sourceKey] of [[card,'imagePath','image'],[card.file,'path','src']]){if(!object?.[pathKey])continue;if(!object[sourceKey])throw Error('Reload your online draft to refresh its photos and files before exporting.');const response=await fetch(object[sourceKey]);if(!response.ok)throw Error('Reload your online draft to refresh its photos and files before exporting.');const blob=await response.blob();object[sourceKey]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});delete object[pathKey]}
 }return copy;}
export async function publicPage(slug){if(!cloud)throw Error('Publishing is not connected yet.');const row=check(await cloud.from('published_pages').select('*').eq('slug',slug).maybeSingle());if(!row||row.moderated_at)throw Error('This page is not published.');return resolveImages(row.document)}
export function accountDialog(getState,loadState,saving,confirmPublish=async()=>true){
 const dialog=document.createElement('dialog');dialog.className='account-dialog';dialog.innerHTML='<button class="account-close" aria-label="Close account"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2>Your Verbaspark</h2><div class="account-content"></div>';document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('.account-close').onclick=()=>dialog.close();const content=dialog.querySelector('.account-content');
 const message=text=>{content.querySelector('[role=status]').textContent=text};
 const run=fn=>async event=>{event.preventDefault();const buttons=[...content.querySelectorAll('button')].map(button=>[button,button.disabled]);buttons.forEach(([button])=>button.disabled=true);try{await fn()}catch(e){message(e.code==='23505'?'That username is already taken.':e.code==='23514'?'Use 3–30 lowercase letters, numbers, or hyphens for the public username.':e.message)}finally{buttons.forEach(([button,disabled])=>button.disabled=disabled)}};
 if(!cloud){content.innerHTML='<p>Online accounts and publishing need a Supabase connection.</p><p>Your local editor is still available. Setup instructions are in <strong>SETUP.md</strong>.</p>';return}
 const show=async()=>{try{const {session}=check(await cloud.auth.getSession());if(!session){content.innerHTML='<p>Sign in or create an account with a link sent to your email.</p><form><label>Email<input type="email" name="email" required autocomplete="email"></label><button class="primary">Send sign-in link</button></form><p role="status"></p>';content.querySelector('form').onsubmit=run(async()=>{check(await cloud.auth.signInWithOtp({email:content.querySelector('input').value,options:{emailRedirectTo:location.origin+location.pathname}}));message('Check your email for the sign-in link. Open it in this browser, then reopen Account.');});return}
 content.innerHTML='<p class="account-email"></p><p>Your private draft saves automatically after editing. Published pages only change when you publish again.</p><div class="account-actions"><button id="cloud-save">Save draft online</button><button id="cloud-load">Load online draft</button></div><label>Public username<input id="publish-slug" pattern="[a-z0-9](?:[a-z0-9]|-){2,29}" minlength="3" maxlength="30" placeholder="your-name"></label><p class="hint">3–30 lowercase letters, numbers, or hyphens. Your display name can keep spaces and accents.</p><p id="slug-preview" class="hint" aria-live="polite"></p><button id="cloud-publish" class="primary">Publish current page ↗</button><p id="public-link"></p><div class="account-actions"><button id="cloud-unpublish">Unpublish</button><button id="cloud-account-data">Account & data</button><button id="cloud-logout">Sign out</button></div><p role="status"></p>';
 content.querySelector('.account-email').textContent=session.user.email;
 const row=check(await cloud.from('published_pages').select('slug').eq('owner_id',session.user.id).maybeSingle());
 const restriction=await cloud.from('platform_restrictions').select('reason').eq('owner_id',session.user.id).maybeSingle();
 if(!restriction.error&&restriction.data){const warning=document.createElement('p');warning.className='account-restriction';warning.textContent='Publishing is restricted by Verbaspark: '+restriction.data.reason+' Your private draft remains available.';content.querySelector('#cloud-publish').before(warning);content.querySelector('#cloud-publish').disabled=true}
 const link=slug=>{const a=document.createElement('a');a.href=location.origin+'/p/'+slug;a.target='_blank';a.rel='noopener';a.textContent=a.href;content.querySelector('#public-link').replaceChildren(a)};
 const slugInput=content.querySelector('#publish-slug');
 slugInput.value=row?.slug||normalizeSlug(getState().name);
 const updateSlugPreview=()=>{const candidate=normalizeSlug(slugInput.value);content.querySelector('#slug-preview').textContent=validSlug(candidate)?'Public address: '+location.origin+'/p/'+candidate:'Enter at least three letters or numbers for your public address.'};
 slugInput.oninput=()=>{slugInput.setCustomValidity('');updateSlugPreview()};
 updateSlugPreview();
 if(row)link(row.slug);
 content.querySelector('#cloud-save').onclick=run(async()=>{await saving.flush();message('Private draft saved online. Your published page has not changed.');});
 content.querySelector('#cloud-load').onclick=run(async()=>{loadState(await saving.loadOnline(),{alreadySaved:true});message('Online draft loaded. Undo restores your previous local page.');});
 content.querySelector('#cloud-publish').onclick=run(async()=>{const requested=normalizeSlug(slugInput.value);slugInput.value=requested;updateSlugPreview();if(!validSlug(requested)){slugInput.setCustomValidity('Use 3–30 lowercase letters, numbers, or hyphens.');slugInput.reportValidity();message('Choose a public username with 3–30 lowercase letters, numbers, or hyphens.');return}slugInput.setCustomValidity('');if(!await confirmPublish())return;const revision=await saving.flush();const slug=check(await cloud.rpc('publish_page',{requested_slug:requested,expected_revision:revision,expected_owner:session.user.id}));link(slug);message('Published. The link now shows this version of your page.');});
 content.querySelector('#cloud-unpublish').onclick=run(async()=>{check(await cloud.from('published_pages').delete().eq('owner_id',session.user.id));content.querySelector('#public-link').replaceChildren();message('Page unpublished. Your private draft is still saved.');});
 content.querySelector('#cloud-account-data').onclick=run(async()=>{await openAccountData({cloud,getState,exportImages,saving});dialog.close()});
 content.querySelector('#cloud-logout').onclick=run(async()=>{check(await cloud.auth.signOut());await show()});
 }catch(e){content.textContent=e.message}};show();
}

