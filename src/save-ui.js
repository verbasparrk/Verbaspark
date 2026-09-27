import {cloud,saveDraft,resolveImages} from './cloud.js';
import {Autosave} from './autosave.js';
import {exportImages} from './cloud.js';
import {DraftStore} from './draft-store.js';
import {cleanPage} from './page-data.js';
const remote={
 async read(userId){const {data,error}=await cloud.from('drafts').select('document,revision,last_save_id,updated_at').eq('owner_id',userId).maybeSingle();if(error)throw error;return data},
 write:saveDraft,
 async resolve(document){return resolveImages(cleanPage(document))}
};
export function createSaving(){return new Autosave({store:new DraftStore(),remote,onStatus:paintSaving})}
let active=null,replacePage=null;
export function paintSaving(status){
 if(!status)return;
 let label='Saved on device',detail='Your draft is saved on this device. Sign in to enable online autosave.',tone='ok';
 if(status.local==='saving'){label='Saving on device…';detail='Writing a recovery copy on this device.';tone='busy'}
 if(status.connected){
  if(['pending','checking'].includes(status.cloud)){label='Waiting to sync';detail='Your private draft will save online shortly.';tone='busy'}
  if(status.cloud==='saving'){label='Saving online…';detail='Saving your private draft. Published pages stay unchanged.';tone='busy'}
  if(status.cloud==='saved'){label='Saved online';detail='Private draft saved online. Publish separately to update your public page.'}
  if(status.cloud==='offline'){label='Offline · kept on device';detail='Your changes are queued. Online saving resumes when you reconnect.';tone='warning'}
  if(status.cloud==='error'){label='Sync needs attention';detail=status.error||'Online saving failed. We will retry automatically.';tone='warning'}
  if(status.blocked){label='Choose version';detail=status.blocked==='account'?'This device has a page from another account. Choose which version to use.':'Two versions of your page are available. Choose one to continue editing.';tone='warning'}
 }
 if(status.local==='error'){label='Device save failed';detail=status.error; tone='danger'}
 document.querySelectorAll('[data-save-label]').forEach(el=>el.textContent=label);
 document.querySelectorAll('[data-save-status]').forEach(el=>{el.dataset.tone=tone;el.title=detail});
 const notice=document.querySelector('#save-notice');if(notice){notice.hidden=!['warning','danger'].includes(tone);notice.querySelector('span').textContent=detail;notice.dataset.tone=tone}
 const info=document.querySelector('#recovery-info');if(info)info.textContent=detail;
}
export function bindSaving(manager,load){active=manager;replacePage=load;document.querySelector('#save-status')?.addEventListener('click',()=>openRecovery());document.querySelector('#open-recovery')?.addEventListener('click',()=>openRecovery());paintSaving(manager.status())}
export function startSaving(manager){
 const offline=()=>{clearTimeout(manager.timer);manager.cloudState='offline';manager.notify()};
 window.addEventListener('offline',offline);window.addEventListener('online',()=>manager.retry().catch(()=>{}));
 window.addEventListener('beforeunload',event=>{if(!manager.status().localDurable&&manager.row.id!==manager.row.syncedId){event.preventDefault();event.returnValue=''}});
 // A synchronous emergency checkpoint supplements IndexedDB on navigation.
 window.addEventListener('pagehide',()=>{if(!manager.status().localDurable){try{localStorage.setItem('verbaspark-recovery-v2',JSON.stringify(manager.row))}catch{}}});
 if(cloud){
  cloud.auth.onAuthStateChange((_event,session)=>{setTimeout(async()=>{
   try{
    await manager.connect(session?.user||null);
    if(session?.user&&manager.canUseOnlineWithoutChoice()){
     replacePage(await manager.loadOnline(),{alreadySaved:true});
    }else if(manager.block&&!document.querySelector('.recovery-dialog'))openRecovery();
   }catch(error){manager.error=error.message;manager.notify()}
  },0)});
  let checking=null,lastCheck=0;
  const refresh=()=>{if(document.hidden||checking||Date.now()-lastCheck<2000)return;lastCheck=Date.now();checking=manager.checkForRemoteUpdate().then(document=>{if(document)replacePage(document,{alreadySaved:true})}).catch(()=>{}).finally(()=>checking=null)};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
 }
}
function download(pageDocument){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({format:'verbaspark-backup',version:1,document:pageDocument},null,2)],{type:'application/json'}));a.download='verbaspark-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
export function openRecovery(){const manager=active;if(!manager)return;const dialog=document.createElement('dialog');dialog.className='account-dialog recovery-dialog';dialog.setAttribute('aria-label','Save and recovery');dialog.innerHTML='<button class="account-close" aria-label="Close recovery"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2>Save & recovery</h2><p id="recovery-info"></p><div class="recovery-actions"><button id="retry-save">Retry saving</button><button id="backup-download">Download backup</button></div><label>Restore a backup<input id="backup-import" type="file" accept="application/json,.json"></label><div id="cloud-choices"></div><h3>Recent device versions</h3><p class="hint">Restoring a version keeps the current page in recovery history.</p><div id="recovery-list"></div><p id="recovery-message" role="status"></p>';
 document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('.account-close').onclick=()=>dialog.close();paintSaving(manager.status());const message=text=>{dialog.querySelector('#recovery-message').textContent=text};
 const run=fn=>async()=>{try{await fn()}catch(error){message(error.message)}};
 dialog.querySelector('#retry-save').onclick=run(async()=>{await manager.retry();message('Save retry requested.')});dialog.querySelector('#backup-download').onclick=async()=>{const snapshot=structuredClone(manager.row.document);try{download(await exportImages(snapshot));message('Backup downloaded with your photos and files.')}catch{download(snapshot);message('Backup downloaded. Cloud photos or files could not be embedded; reconnect and download again for a complete backup.')}};
 dialog.querySelector('#backup-import').onchange=run(async()=>{const file=dialog.querySelector('#backup-import').files[0];if(!file)return;if(file.size>100000000)throw Error('Choose a backup smaller than 100 MB.');const backup=JSON.parse(await file.text());if(backup.format!=='verbaspark-backup'||backup.version!==1)throw Error('Choose a Verbaspark backup file.');const document=cleanPage(backup.document);replacePage(document);message('Backup restored. Undo is available in the editor.');await list()});
 if(manager.user&&manager.block){
  const box=dialog.querySelector('#cloud-choices');box.innerHTML='<h3>Choose a version to continue</h3><p class="hint">Both versions stay in this device’s recovery history. Your public page changes only when you publish again.</p><div class="draft-comparison"><div class="draft-choice"><strong>On this device</strong><span id="local-draft-name"></span><small id="local-draft-time"></small></div><div class="draft-choice"><strong>Online</strong><span id="online-draft-name">Checking…</span><small id="online-draft-time"></small></div></div><div class="recovery-actions"><button id="choose-online" class="primary" disabled>Continue with online version</button><button id="choose-local">Use this device’s version</button></div><p class="hint">Using this device’s version replaces the private online draft. The current public page stays as it is.</p>';
  box.querySelector('#local-draft-name').textContent=manager.row.document.name||'Untitled page';
  box.querySelector('#local-draft-time').textContent='Saved '+new Date(manager.row.time).toLocaleString();
  manager.remote.read(manager.user.id).then(row=>{if(!box.isConnected)return;box.querySelector('#online-draft-name').textContent=row?.document?.name||'No online draft';box.querySelector('#online-draft-time').textContent=row?.updated_at?'Saved '+new Date(row.updated_at).toLocaleString():'Last saved time unavailable';box.querySelector('#choose-online').disabled=!row}).catch(()=>{if(box.isConnected)box.querySelector('#online-draft-name').textContent='Could not check online version';});
  box.querySelector('#choose-online').onclick=run(async()=>{const document=await manager.loadOnline();replacePage(document,{alreadySaved:true});box.replaceChildren();message('Online version ready. Your earlier device version remains in recovery history.');await list()});
  box.querySelector('#choose-local').onclick=run(async()=>{await manager.chooseLocal();box.replaceChildren();message('This device’s version is now saved online.');await list()});
 }
 async function list(){const rows=await manager.store.list();const list=dialog.querySelector('#recovery-list');list.replaceChildren();for(const row of rows){const button=document.createElement('button');button.textContent=`${new Date(row.time).toLocaleString()} · ${row.document.name||'Untitled page'}${row.id===manager.row.id?' · current':''}`;button.disabled=row.id===manager.row.id;button.onclick=run(async()=>{const document=cleanPage(row.document);replacePage(document);message('Recovery version restored.');await manager.localQueue;await list()});list.append(button)}if(!rows.length)list.textContent='No saved versions yet.'}list().catch(error=>message(error.message));
}
export function captureTyping(manager,state){
 const root=document.querySelector('#app');root.oninput=event=>{
  const input=event.target;const document=structuredClone(state());const selected=document.cards.find(c=>c.id===window.document.querySelector('.card.selected')?.dataset.id);let changed=false;
  const key={'location-address':'address','location-latitude':'latitude','location-longitude':'longitude','card-subtitle':'subtitle','card-cta':'ctaLabel','card-title':'title','card-body':'body','card-url':'url','photo-alt':'alt'}[input.id];
  if(key&&selected){selected[key]=input.value;if(key==='address'){selected.latitude='';selected.longitude='';selected.mapEmbed=''}changed=true}
  if(input.id==='page-name'){document.name=input.value;changed=true}
  if(input.isContentEditable){const card=document.cards.find(c=>c.id===input.closest('.card')?.dataset.id);if(card){card[input.tagName==='H2'?'title':'body']=input.innerText;changed=true}}
  if(input.dataset.caption!==undefined&&selected?.images?.[Number(input.dataset.caption)]){selected.images[Number(input.dataset.caption)].caption=input.value;changed=true}
  if(changed)manager.edit(document);
 };
}

