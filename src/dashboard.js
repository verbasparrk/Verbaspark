import {cloud} from './cloud.js';
import {publicationFingerprint} from './publication-state.js';
import {icon} from './icons.js';

export function openDashboard(getState,{edit,account,publish,onlineDraft}){
 const dialog=document.createElement('dialog');
 dialog.className='account-dialog page-dashboard';
 dialog.setAttribute('aria-labelledby','dashboard-heading');
 dialog.innerHTML=`<button class="account-close" aria-label="Close My page">${icon('close')}</button>
  <span class="eyebrow">YOUR WORKSPACE</span><h2 id="dashboard-heading">My page</h2>
  <section class="dashboard-summary"><span id="publication-status" class="publication-status">Checking publication…</span><h3 id="dashboard-name"></h3><p id="publication-detail"></p></section>
  <div class="dashboard-actions"><button id="dashboard-edit" class="primary">${icon('edit')} Edit page</button><button id="dashboard-publish">${icon('arrow')} Publish page</button></div>
  <section class="dashboard-sync"><h3>Work across devices</h3><p id="dashboard-sync-detail">Checking your online draft…</p><button id="dashboard-load" hidden>Load online draft</button><p class="hint">On another device, sign in with the same email. Your current device version stays in Save & recovery when you load the online draft.</p></section>
  <section id="dashboard-sharing" hidden><h3>Share your page</h3><label>Public link<input id="dashboard-url" readonly></label><div class="dashboard-actions"><a id="dashboard-open" target="_blank" rel="noopener">${icon('arrow')} Open profile</a><button id="dashboard-copy">${icon('copy')} Copy link</button></div><details class="dashboard-qr"><summary>QR code for sharing</summary><div class="qr-content"><img id="dashboard-qr" alt="QR code linking to your published profile" width="224" height="224"><a id="dashboard-download" download="verbaspark-qr.png">${icon('download')} Download QR code</a></div></details></section>
  <p id="dashboard-message" role="status"></p><div class="dashboard-footer"><button id="dashboard-account">Account & publishing</button><button id="dashboard-refresh">${icon('refresh')} Refresh status</button></div>`;
 document.body.append(dialog);
 dialog.showModal();
 let generation=0;
 const find=id=>dialog.querySelector('#'+id);
 const leave=fn=>()=>{dialog.close();fn()};
 dialog.querySelector('.account-close').onclick=()=>dialog.close();
 find('dashboard-edit').onclick=leave(edit);
 find('dashboard-account').onclick=leave(account);
 find('dashboard-publish').onclick=leave(publish);
 find('dashboard-load').onclick=async()=>{
  const button=find('dashboard-load');button.disabled=true;find('dashboard-message').textContent='Loading your online draft…';
  try{await onlineDraft();dialog.close()}catch(error){button.disabled=false;find('dashboard-message').textContent=error.message}
 };
 const subscription=cloud?.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN'].includes(event))refresh()}).data.subscription;
 dialog.onclose=()=>{generation++;subscription?.unsubscribe();dialog.remove()};
 async function refresh(){
  const version=++generation,current=()=>dialog.isConnected&&generation===version;
  const status=find('publication-status'),detail=find('publication-detail');
  find('dashboard-name').textContent=getState().name||'Untitled page';
  find('dashboard-sharing').hidden=true;
  find('dashboard-publish').hidden=true;
  find('dashboard-load').hidden=true;
  find('dashboard-message').textContent='';
  find('dashboard-sync-detail').textContent='Checking your online draft…';
  status.textContent='Checking publication…';status.dataset.state='checking';detail.textContent='';
  try{
   const {data,error}=cloud?await cloud.auth.getSession():{data:{session:null}};
   if(error)throw error;if(!current())return;
   const user=data.session?.user;
   if(!user){
    status.textContent='Local draft';status.dataset.state='draft';
    detail.textContent='Your page is saved on this device. Sign in through Account & publishing to publish it.';
    find('dashboard-sync-detail').textContent='Sign in to save your draft online and edit it on another device.';
    return;
   }
   const [result,draftResult,restrictionResult]=await Promise.all([
    cloud.from('published_pages').select('slug,document').eq('owner_id',user.id).maybeSingle(),
    cloud.from('drafts').select('revision').eq('owner_id',user.id).maybeSingle(),
    cloud.from('platform_restrictions').select('reason').eq('owner_id',user.id).maybeSingle()
   ]);
   if(!current())return;
   if(draftResult.error)find('dashboard-sync-detail').textContent='Could not check your online draft. Try Refresh status.';
   else if(draftResult.data){
    find('dashboard-sync-detail').textContent=`An online draft is available for ${user.email}. Sign in with this email on another device to continue editing.`;
    find('dashboard-load').hidden=false;
   }else find('dashboard-sync-detail').textContent=`Signed in as ${user.email}. Your first online save is still pending.`;
   if(result.error)throw result.error;
   const row=result.data;
   if(!restrictionResult.error&&restrictionResult.data){
    status.textContent='Restricted';status.dataset.state='restricted';
    detail.textContent='Verbaspark has hidden this profile: '+restrictionResult.data.reason+' Your private draft is still available.';
    return;
   }
   find('dashboard-publish').hidden=false;
   if(!row){
    status.textContent='Not published';status.dataset.state='draft';
    detail.textContent='Your draft is private. Publish it when you are ready to share.';
    find('dashboard-publish').textContent='Publish page';
    return;
   }
   const [draft,live]=await Promise.all([publicationFingerprint(getState(),user.id),publicationFingerprint(row.document,user.id)]);
   if(!current())return;
   const changed=draft!==live;
   status.textContent=changed?'Unpublished changes':'Published · up to date';
   status.dataset.state=changed?'changes':'published';
   detail.textContent=changed?'Visitors see your last published version. Publish again to share these changes.':'Your current page matches the published version.';
   find('dashboard-publish').textContent=changed?'Publish changes':'Manage publication';
   const url=location.origin+'/p/'+encodeURIComponent(row.slug);
   find('dashboard-url').value=url;find('dashboard-open').href=url;find('dashboard-sharing').hidden=false;
   find('dashboard-copy').onclick=async()=>{try{await navigator.clipboard.writeText(url);if(current())find('dashboard-message').textContent='Link copied.'}catch{if(current()){find('dashboard-url').focus();find('dashboard-url').select();find('dashboard-message').textContent='Copy the selected link manually.'}}};
   find('dashboard-qr').hidden=true;find('dashboard-download').hidden=true;
   try{
    const {default:QR}=await import('qrcode');
    const png=await QR.toDataURL(url,{width:448,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}});
    if(!current())return;
    find('dashboard-qr').src=png;find('dashboard-qr').hidden=false;
    find('dashboard-download').href=png;find('dashboard-download').hidden=false;
   }catch{if(current())find('dashboard-message').textContent='QR code could not be generated. You can still copy the link.'}
  }catch(error){if(current()){status.textContent='Status unavailable';status.dataset.state='changes';detail.textContent='Could not check your published page. Your draft is still available.';find('dashboard-message').textContent=error.message}}
 }
 find('dashboard-refresh').onclick=refresh;
 refresh();
}
