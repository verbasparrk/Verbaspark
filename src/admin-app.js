import {cloud} from './cloud.js';
import './admin.css';

const app=document.querySelector('#admin-app');
let query='',filter='all',page=1,request=0;
const el=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node};
const date=value=>value?new Date(value).toLocaleDateString():'—';
const number=value=>new Intl.NumberFormat().format(value||0);

async function call(method='GET',input){
 const {data,error}=await cloud.auth.getSession();
 if(error||!data.session)throw Error('Sign in again to continue.');
 const url=new URL('/api/admin',location.origin);
 if(method==='GET'){url.searchParams.set('q',query);url.searchParams.set('status',filter);url.searchParams.set('page',page)}
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+data.session.access_token,...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,cache:'no-store'});
 const result=await response.json().catch(()=>({error:'The server response could not be read.'}));
 if(!response.ok)throw Error(result.error||'Request failed.');
 return result;
}

function shell(email){
 app.innerHTML='<header class="admin-top"><a href="/" class="admin-brand"><span>✦</span> Verbaspark <em>ADMIN</em></a><nav><a href="/editor/">Open editor</a><button id="admin-signout">Sign out</button></nav></header><main class="admin-main"><div class="admin-intro"><div><span class="admin-kicker">PLATFORM OVERVIEW</span><h1>Admin dashboard</h1><p>Accounts, public profiles and moderation in one place.</p></div><span id="admin-email"></span></div><section id="admin-metrics" class="admin-metrics" aria-label="Platform metrics"></section><section class="admin-panel"><div class="admin-panel-head"><div><h2>Accounts & profiles</h2><p>Private drafts and messages are not shown here.</p></div><button id="admin-refresh">Refresh</button></div><div class="admin-controls"><label>Search email, name or username<input id="admin-search" type="search" maxlength="80" placeholder="Search accounts or profiles"></label><label>Status<select id="admin-filter"><option value="all">All accounts</option><option value="live">Published</option><option value="hidden">Restricted</option><option value="draft">No published page</option></select></label></div><p id="admin-table-status" role="status"></p><div class="admin-table-wrap"><table><thead><tr><th>Account</th><th>Profile</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody id="admin-rows"></tbody></table></div><div class="admin-pagination"><button id="admin-prev">Previous</button><span id="admin-page"></span><button id="admin-next">Next</button></div></section><section class="admin-panel"><div class="admin-panel-head"><div><h2>Recent actions</h2><p>Every restriction and restoration is recorded.</p></div></div><div id="admin-audit" class="admin-audit"></div></section></main>';
 document.querySelector('#admin-email').textContent=email;
 const reportSection=el('section','','admin-panel');reportSection.innerHTML='<div class="admin-panel-head"><div><h2>Profile reports</h2><p>Review visitor reports before taking action.</p></div><select id="report-filter" aria-label="Report status"><option value="open">Open</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option></select></div><p id="report-status" role="status"></p><div id="report-list" class="admin-audit"></div>';
 document.querySelector('#admin-metrics').after(reportSection);
 document.querySelector('#report-filter').onchange=loadReports;
 document.querySelector('#admin-signout').onclick=async()=>{await cloud.auth.signOut();showLogin()};
 document.querySelector('#admin-refresh').onclick=()=>{load();loadReports()};
 const search=document.querySelector('#admin-search');search.value=query;let timer;
 search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{query=search.value.trim();page=1;load()},300)};
 const select=document.querySelector('#admin-filter');select.value=filter;select.onchange=()=>{filter=select.value;page=1;load()};
 document.querySelector('#admin-prev').onclick=()=>{page--;load()};
 document.querySelector('#admin-next').onclick=()=>{page++;load()};
}

async function reportCall(method='GET',input){
 const {data}=await cloud.auth.getSession();if(!data.session)throw Error('Sign in again.');
 const url=new URL('/api/reports',location.origin);if(method==='GET')url.searchParams.set('status',document.querySelector('#report-filter').value);
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+data.session.access_token,...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,cache:'no-store'});
 const result=await response.json().catch(()=>({error:'Reports unavailable.'}));if(!response.ok)throw Error(result.error||'Reports unavailable.');return result;
}
async function loadReports(){
 const list=document.querySelector('#report-list'),status=document.querySelector('#report-status');if(!list)return;
 status.textContent='Loading reports…';list.replaceChildren();
 try{const {rows}=await reportCall();if(!list.isConnected)return;status.textContent=rows.length+' reports shown';
  for(const row of rows){const item=el('div','','admin-report-item'),top=el('div','','admin-report-top'),link=el('a','/p/'+row.slug);link.href='/p/'+encodeURIComponent(row.slug);link.target='_blank';link.rel='noopener';top.append(link,el('small',date(row.created_at)));item.append(top,el('strong',row.reason),el('p',row.details||'No additional details.'));
   if(row.status==='open'){const actions=el('div','','admin-report-actions');for(const [label,action] of [['Mark reviewed','reviewed'],['Dismiss','dismissed']]){const button=el('button',label);button.onclick=async()=>{button.disabled=true;try{await reportCall('POST',{id:row.id,status:action});loadReports()}catch(error){status.textContent=error.message;button.disabled=false}};actions.append(button)}const restrict=el('button','Restrict profile');restrict.onclick=()=>moderation({id:row.owner_id,slug:row.slug,email:'Reported profile'});actions.append(restrict);item.append(actions)}list.append(item)}
  if(!rows.length)list.append(el('p','No reports in this category.','admin-empty'));
 }catch(error){status.textContent=error.message}
}
function metric(label,value){const card=el('div','','admin-metric');card.append(el('span',label),el('strong',number(value)));return card}
function moderation(row){
 const hidden=!!row.restriction_reason,dialog=document.createElement('dialog');
 dialog.className='admin-dialog';
 dialog.innerHTML='<form><button type="button" class="admin-close" aria-label="Close">×</button><span class="admin-kicker">MODERATION</span><h2></h2><p id="moderation-target"></p><label>Reason<textarea required minlength="5" maxlength="500" rows="4" placeholder="Explain this action"></textarea></label><p class="admin-help"></p><p role="status"></p><div class="admin-dialog-actions"><button type="button" class="admin-cancel">Cancel</button><button type="submit" class="admin-primary"></button></div></form>';
 document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();
 dialog.querySelector('h2').textContent=hidden?'Restore account':'Restrict account';
 dialog.querySelector('#moderation-target').textContent=row.email+(row.slug?' · /p/'+row.slug:' · no published page');
 dialog.querySelector('.admin-help').textContent=hidden?'The current page becomes public again. Review its content before restoring.':'The public page will disappear and this account cannot publish until restored. The owner keeps their private draft.';
 const close=()=>dialog.close();
 dialog.querySelector('.admin-close').onclick=close;dialog.querySelector('.admin-cancel').onclick=close;
 const submit=dialog.querySelector('[type=submit]');submit.textContent=hidden?'Restore account':'Restrict account';
 dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();submit.disabled=true;dialog.querySelector('[role=status]').textContent='Saving action…';
  try{await call('POST',{action:hidden?'restore':'hide',ownerId:row.id,reason:dialog.querySelector('textarea').value.trim()});close();await load()}
  catch(error){submit.disabled=false;dialog.querySelector('[role=status]').textContent=error.message}
 };
}

function draw(data){
 const metrics=document.querySelector('#admin-metrics');metrics.replaceChildren(
  metric('Accounts',data.summary.accounts),metric('Published',data.summary.live),metric('Restricted',data.summary.hidden),
  metric('Visits · 30 days',data.summary.views30d),metric('Clicks · 30 days',data.summary.clicks30d)
 );
 const rows=document.querySelector('#admin-rows');rows.replaceChildren();
 for(const row of data.rows){
  const tr=document.createElement('tr'),account=el('td'),profile=el('td'),status=el('td'),joined=el('td',date(row.created_at)),action=el('td');
  account.append(el('strong',row.email),el('small',row.id));
  if(row.slug){const link=el('a',row.page_name||row.slug);link.href='/p/'+encodeURIComponent(row.slug);link.target='_blank';link.rel='noopener';profile.append(link,el('small','/p/'+row.slug))}
  else profile.textContent='No published page';
  const state=row.restriction_reason?'Restricted':row.slug?'Published':'Draft only';
  status.append(el('span',state,'admin-state '+(row.restriction_reason?'restricted':row.slug?'live':'draft')));
  const button=el('button',row.restriction_reason?'Restore':'Restrict');button.onclick=()=>moderation(row);action.append(button);
  tr.append(account,profile,status,joined,action);rows.append(tr);
 }
 if(!data.rows.length){const tr=document.createElement('tr'),td=el('td','No accounts match this search.','admin-empty');td.colSpan=5;tr.append(td);rows.append(tr)}
 const total=Number(data.rows[0]?.matching_count||0);
 document.querySelector('#admin-table-status').textContent=total+' matching account'+(total===1?'':'s');
 document.querySelector('#admin-page').textContent='Page '+page;
 document.querySelector('#admin-prev').disabled=page<=1;
 document.querySelector('#admin-next').disabled=page*25>=total;
 const audit=document.querySelector('#admin-audit');audit.replaceChildren();
 for(const entry of data.audit){const item=el('div','','admin-audit-item');item.append(el('strong',(entry.action==='hide'?'Restricted ':'Restored ')+entry.target_email),el('span',date(entry.created_at)),el('p',entry.reason));audit.append(item)}
 if(!data.audit.length)audit.append(el('p','No moderation actions yet.','admin-empty'));
}

async function load(){
 const current=++request,status=document.querySelector('#admin-table-status');if(!status)return;
 status.textContent='Loading accounts…';
 try{const data=await call();if(current===request)draw(data)}
 catch(error){if(current===request){if(error.message==='Administrator access required.'){showDenied();return}status.textContent=error.message}}
}

function showDenied(){app.innerHTML='<main class="admin-gate"><a class="admin-brand" href="/">✦ Verbaspark</a><h1>Admin access required</h1><p>This account does not have permission to manage the platform.</p><a href="/editor/">Return to editor</a><button id="admin-signout">Use another account</button></main>';document.querySelector('#admin-signout').onclick=async()=>{await cloud.auth.signOut();showLogin()}}
function showLogin(){
 app.innerHTML='<main class="admin-gate"><a class="admin-brand" href="/">✦ Verbaspark</a><span class="admin-kicker">PRIVATE WORKSPACE</span><h1>Admin sign in</h1><p>Use the email address assigned as a Verbaspark administrator.</p><form><label>Email<input type="email" required autocomplete="email"></label><button class="admin-primary">Send sign-in link</button></form><p role="status"></p><a href="/editor/">Return to editor</a></main>';
 const form=app.querySelector('form'),message=app.querySelector('[role=status]');
 form.onsubmit=async event=>{event.preventDefault();form.querySelector('button').disabled=true;
  try{const {error}=await cloud.auth.signInWithOtp({email:form.querySelector('input').value,options:{emailRedirectTo:location.origin+'/admin/'}});if(error)throw error;message.textContent='Check your email. Open the sign-in link in this browser.'}
  catch(error){message.textContent=error.message;form.querySelector('button').disabled=false}
 };
}
async function start(){
 if(!cloud){app.textContent='Supabase is not configured.';return}
 const {data}=await cloud.auth.getSession();
 if(!data.session){showLogin();return}
 shell(data.session.user.email||'Administrator');load();loadReports();
}
cloud?.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN')start()});
start();
