import {cloud} from './cloud.js';
import {toolDialog,requireUser} from './profile-tools.js';

export async function domainRequest(method='GET',input){
 await requireUser();const {data}=await cloud.auth.getSession();
 const response=await fetch('/api/domain',{method,headers:{Authorization:'Bearer '+data.session.access_token,...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,cache:'no-store'});
 const result=await response.json().catch(()=>({error:'Could not read the domain service response.'}));
 if(!response.ok)throw Error(result.error||'Domain request failed.');return result;
}

export async function openCustomDomain(){
 const {dialog,content,message}=toolDialog('Custom domain');content.innerHTML='<p>Use a domain you own as the address of your published profile. One domain can be connected per account.</p><div data-domain-content></div>';
 const area=content.querySelector('[data-domain-content]');
 const add=(parent,tag,value)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el};
 const render=async()=>{area.replaceChildren();message('Checking domain…');try{
  const {domain}=await domainRequest();if(!dialog.isConnected)return;
  if(!domain){const form=document.createElement('form');form.innerHTML='<label>Domain or subdomain<input name="hostname" required placeholder="www.yourname.com" autocomplete="off" spellcheck="false"></label><button class="primary" type="submit">Connect domain</button>';area.append(form);form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;message('Adding domain to Vercel…');try{await domainRequest('POST',{hostname:form.querySelector('input').value});await render()}catch(error){button.disabled=false;message(error.message)}};message('Enter a domain without https:// or a path. You will configure DNS after connecting.');return}
  const heading=add(area,'h3',domain.hostname),badge=add(area,'p',domain.status==='active'?'Active — https://'+domain.hostname+'/':'Waiting for domain verification and DNS');badge.className='domain-status';
  if(domain.status==='active'){const link=add(area,'a','Open profile ↗');link.href='https://'+domain.hostname+'/';link.target='_blank';link.rel='noopener'}
  else{
   add(area,'p','Set the following records with your DNS provider, then click Check connection. Vercel issues HTTPS automatically after the domain is connected.');
   if(domain.claimRecord)add(area,'p',`${domain.claimRecord.type} · ${domain.claimRecord.name} → ${domain.claimRecord.value} (proves that you control this domain)`);
   for(const record of domain.verification||[])add(area,'p',`${record.type} · ${record.name} → ${record.value}`);
   for(const record of domain.records||[])add(area,'p',`${record.type} · ${domain.hostname} → ${record.value}`);
   if(!domain.records?.length)add(area,'p','Open your Vercel project → Settings → Domains for the exact DNS record.');
   const verify=add(area,'button','Check connection');verify.onclick=async()=>{verify.disabled=true;message('Checking DNS and ownership…');try{await domainRequest('POST',{});await render()}catch(error){message(error.message);verify.disabled=false}};
  }
  const remove=add(area,'button','Disconnect domain');remove.className='domain-remove';remove.onclick=async()=>{if(!window.confirm('Disconnect '+domain.hostname+' from this profile? Your /p/username link will still work.'))return;remove.disabled=true;try{await domainRequest('DELETE');await render()}catch(error){message(error.message);remove.disabled=false}};
  message(domain.error||'DNS changes can take time to appear.');
 }catch(error){message(error.message)}};await render();
}
