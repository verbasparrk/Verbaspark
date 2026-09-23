import {cloud} from './cloud.js';
import {refreshInboxBadge} from './inbox-badge.js';
const labels={new:'New',read:'Read',closed:'Closed'};
const check=result=>{if(result.error)throw result.error;return result.data};
export async function showInbox(toolDialog,requireUser){
 const {dialog,content,message}=toolDialog('Inbox');let offset=0,generation=0;
 const filter=document.createElement('select');filter.id='inbox-filter';
 const label=document.createElement('label');label.textContent='Message status';label.append(filter);
 for(const [value,text] of Object.entries({all:'All messages',...labels})){const option=document.createElement('option');option.value=value;option.textContent=text;filter.append(option)}
 const list=document.createElement('div'),more=document.createElement('button');more.textContent='Load more';content.append(label,list,more);
 try{
  const user=await requireUser();
  const load=async(reset=false)=>{
   const run=++generation;if(reset){offset=0;list.replaceChildren()}more.disabled=true;message('Loading messages...');
   try{
    let query=cloud.from('contact_messages').select('id,name,email,message,answers,created_at,status').eq('owner_id',user.id);
    if(filter.value!=='all')query=query.eq('status',filter.value);
    const rows=check(await query.order('created_at',{ascending:false}).order('id').range(offset,offset+49));
    if(run!==generation||!dialog.isConnected)return;offset+=rows.length;
    for(const row of rows){
     const item=document.createElement('article');item.className='inbox-message';item.dataset.status=row.status||'new';
     const title=document.createElement('h3');title.textContent=row.name;
     const date=document.createElement('small');date.textContent=new Date(row.created_at).toLocaleString();
     const body=document.createElement('p');body.textContent=Array.isArray(row.answers)&&row.answers.length?row.answers.map(a=>a.label+': '+(typeof a.value==='boolean'?(a.value?'Yes':'No'):a.value||'Not provided')).join('\n\n'):row.message;
     const status=document.createElement('select');status.setAttribute('aria-label','Status for '+row.name);
     for(const [value,text] of Object.entries(labels)){const option=document.createElement('option');option.value=value;option.textContent=text;status.append(option)}status.value=row.status||'new';
     status.onchange=async()=>{const previous=row.status||'new';status.disabled=true;try{
      const updated=check(await cloud.from('contact_messages').update({status:status.value}).eq('id',row.id).eq('owner_id',user.id).select('id').single());
      if(!updated)throw Error('Message no longer exists.');row.status=status.value;item.dataset.status=row.status;message('Message status saved.');refreshInboxBadge();if(filter.value!=='all')await load(true);
     }catch(error){status.value=previous;message(error.message)}finally{status.disabled=false}};
     const actions=document.createElement('div');actions.className='inbox-actions';actions.append(status);
     if(row.email&&/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(row.email)){
      const reply=document.createElement('a');reply.textContent='Reply';reply.className='inbox-reply';reply.href='mailto:'+encodeURIComponent(row.email)+'?subject='+encodeURIComponent('Re: Verbaspark enquiry from '+String(row.name||'Visitor').replace(/[\r\n]/g,' ').slice(0,100));reply.title='Reply to '+row.email;actions.append(reply);
     }else{const note=document.createElement('small');note.textContent='No email provided';actions.append(note)}
     const remove=document.createElement('button');remove.textContent='Delete message';remove.onclick=async()=>{if(!confirm('Delete this message permanently?'))return;remove.disabled=true;try{check(await cloud.from('contact_messages').delete().eq('id',row.id).eq('owner_id',user.id));refreshInboxBadge();await load(true)}catch(error){message(error.message);remove.disabled=false}};actions.append(remove);
     item.append(title,date,body,actions);list.append(item);
    }
    more.hidden=rows.length<50;message(offset?'Messages are private to your account.':filter.value==='all'?'No messages yet. Enable the contact form in Profile settings and publish your page.':'No messages with this status.');
   }catch(error){if(run===generation)message(/status|schema cache/i.test(error.message)?'Run supabase/migrations/009_inbox_status.sql in Supabase, then reopen Messages.':error.message)}finally{if(run===generation)more.disabled=false}
  };
  filter.onchange=()=>load(true);more.onclick=()=>load();await load(true);refreshInboxBadge();
 }catch(error){message(error.message);more.hidden=true}
}
