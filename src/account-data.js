import {DraftStore} from './draft-store.js';

function download(pageDocument){
 const blob=new Blob([JSON.stringify({format:'verbaspark-backup',version:1,document:pageDocument},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='verbaspark-backup.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function openAccountData({cloud,getState,exportImages,saving}){
 const {data,error}=await cloud.auth.getSession();
 if(error||!data.session)throw Error('Sign in first.');
 const email=data.session.user.email;
 const dialog=document.createElement('dialog');
 dialog.className='account-dialog account-data-dialog';
 dialog.setAttribute('aria-labelledby','account-data-heading');
 dialog.innerHTML='<button class="account-close" aria-label="Close account data">×</button><h2 id="account-data-heading">Account & data</h2><p>Keep a copy of your page before removing anything.</p><button id="account-backup">Download page backup with uploads</button><p class="hint">This backup contains the current page, photos and files. It does not include Inbox messages or visit statistics.</p><details class="account-delete"><summary>Delete my account</summary><p>This permanently removes your page, private draft, uploads, Inbox messages and statistics. Public links will stop working. This cannot be undone.</p><form id="delete-account-form"><label>Account email<input id="delete-email" type="email" required autocomplete="off"></label><label>Type DELETE<input id="delete-phrase" required autocomplete="off"></label><button id="delete-account" type="submit" disabled>Delete account permanently</button></form></details><p id="account-data-message" role="status"></p><a id="account-return" href="/" hidden>Return to home page</a>';
 document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();
 const find=id=>dialog.querySelector('#'+id),message=text=>find('account-data-message').textContent=text;
 dialog.querySelector('.account-close').onclick=()=>dialog.close();
 find('account-backup').onclick=async()=>{
  const button=find('account-backup');button.disabled=true;message('Preparing backup…');
  try{download(await exportImages(structuredClone(getState())));message('Page backup downloaded. Keep it somewhere private.')}
  catch(error){message(error.message||'Could not prepare the backup. Reload your online draft and try again.')}
  finally{button.disabled=false}
 };
 const form=find('delete-account-form'),submit=find('delete-account');
 const validate=()=>{submit.disabled=find('delete-email').value.trim()!==email||find('delete-phrase').value!=='DELETE'};
 form.oninput=validate;
 form.onsubmit=async event=>{
  event.preventDefault();validate();if(submit.disabled)return;
  submit.disabled=true;message('Deleting account and uploaded files…');
  try{
   const session=(await cloud.auth.getSession()).data.session;
   if(!session)throw Error('Sign in again before deleting your account.');
   const response=await fetch('/api/account',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'delete',confirmEmail:email,confirmPhrase:'DELETE'}),cache:'no-store',signal:AbortSignal.timeout(120000)});
   const result=await response.json().catch(()=>({error:'Could not read the server response.'}));
   if(!response.ok)throw Error(result.error||'Account deletion failed. Please retry.');
   saving.dispose();
   await saving.localQueue.catch(()=>{});
   let cleanupError='';
   try{await new DraftStore().clear()}catch{cleanupError='Your online account was deleted, but browser recovery data could not be cleared. Clear site data in your browser.'}
   try{const {error}=await cloud.auth.signOut({scope:'local'});if(error)throw error}catch{cleanupError+=' Sign-out needs attention; clear site data in your browser.'}
   if(cleanupError){message(cleanupError.trim());find('account-return').hidden=false;form.hidden=true;find('account-backup').hidden=true}
   else location.replace('/');
  }catch(error){message(error.message);validate()}
 };
}
