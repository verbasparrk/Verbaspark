import {cloud} from './cloud.js';
let started=false,count=0,generation=0;
function paint(){
 for(const button of document.querySelectorAll('[data-main-section="inbox"],[data-mobile-tool="inbox"],#inbox')){
  button.querySelector('.inbox-badge')?.remove();
  if(count){const badge=document.createElement('small');badge.className='inbox-badge';badge.textContent=count>99?'99+':String(count);badge.setAttribute('aria-label',`${count} new messages`);button.append(badge)}
 }
}
export async function refreshInboxBadge(){
 const run=++generation;
 if(!cloud)return;
 try{const {data}=await cloud.auth.getSession();if(run!==generation)return;
  if(!data.session){count=0;paint();return}
  const result=await cloud.from('contact_messages').select('id',{count:'exact',head:true}).eq('owner_id',data.session.user.id).eq('status','new');
  if(run!==generation)return;count=result.error?0:result.count||0;paint();
 }catch{if(run===generation){count=0;paint()}}
}
export function mountInboxBadge(){
 paint();if(started||!cloud)return;started=true;
 cloud.auth.onAuthStateChange(()=>{generation++;count=0;paint();setTimeout(refreshInboxBadge,0)});
 window.addEventListener('focus',refreshInboxBadge);
 setInterval(()=>{if(!document.hidden)refreshInboxBadge()},60000);
 refreshInboxBadge();
}
