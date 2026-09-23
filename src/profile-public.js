import {cleanFields} from './contact-fields.js';
import {cleanProfile,languages,makeVCard} from './profile-data.js';
import {cloud} from './cloud.js';
const words={en:{contact:'Contact me',name:'Name',email:'Email',message:'Message',send:'Send message',save:'Save contact',sent:'Message sent. Thank you!',preview:'Available on your published page.',privacy:'Your name, email and message will be shared with this profile’s owner.'},sl:{contact:'Piši mi',name:'Ime',email:'E-pošta',message:'Sporočilo',send:'Pošlji sporočilo',save:'Shrani kontakt',sent:'Sporočilo je poslano. Hvala!',preview:'Na voljo na objavljeni strani.',privacy:'Tvoje ime, e-pošta in sporočilo bodo posredovani lastniku tega profila.'}};
export function profileExtras(page,esc,language,includeForm=true){const p=cleanProfile(page.profile),codes=[...new Set([p.defaultLanguage,...p.languages])],t=words[language]||words.en;return `${codes.length>1?`<label class="public-language">Language / Jezik<select data-profile-language>${codes.map(code=>`<option value="${code}" ${code===language?'selected':''}>${languages[code]}</option>`).join('')}</select></label>`:''}${p.vcard.enabled?`<a class="vcard-download" download="contact.vcf" href="data:text/vcard;charset=utf-8,${esc(encodeURIComponent(makeVCard({...p.vcard,name:p.vcard.name||page.name})))}">${t.save} ↓</a>`:''}${includeForm?contactFormHTML(page,esc,language):''}`}

export function contactFormHTML(page,esc,language,editing=false){const p=cleanProfile(page.profile),t=words[language]||words.en;if(!p.contactForm)return '';return `<section class="public-contact"><h2>${t.contact}</h2><form data-contact-form>${contactInputs(p.contactFields,esc,t,editing)}<div class="form-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="hint">${language==='sl'?'Vneseni podatki bodo posredovani lastniku profila.':'The information you enter will be shared with this profile owner.'}</p><button type="submit">${t.send}</button><p role="status"></p></form></section>`}
export function bindPublicProfile(page,{slug='',language='en',changeLanguage,trackView=true}){
 const root=document.querySelector('.personal-page');if(!root)return;const t=words[language]||words.en;
 root.querySelector('[data-profile-language]')?.addEventListener('change',event=>changeLanguage(event.target.value));
 const form=root.querySelector('[data-contact-form]');let sending=false;
 if(form)form.onsubmit=async event=>{
  event.preventDefault();if(sending)return;
  const status=form.querySelector('[role=status]'),button=form.querySelector('button');
  if(!slug){status.textContent=t.preview;return}
  if(!form.reportValidity())return;
  sending=true;button.disabled=true;form.setAttribute('aria-busy','true');
  const ui=language==='sl'?{sending:'Pošiljanje...',retry:'Poskusi znova',error:'Dostave ni bilo mogoče potrditi. Podatki so ohranjeni. Poskusi znova.'}:{sending:'Sending...',retry:'Try again',error:'Could not confirm delivery. Your information is preserved. Please try again.'};
  button.textContent=ui.sending;status.textContent=ui.sending;
  const values=Object.fromEntries(new FormData(form));
  const inputs=[...form.querySelectorAll('input,textarea,select')];inputs.forEach(input=>input.disabled=true);
  try{
   const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,values,slug}),signal:AbortSignal.timeout(20000)});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Service unavailable');
   const result=await response.json();if(!response.ok||result.ok!==true)throw Error('Submission failed');
   form.reset();status.textContent=cleanProfile(page.profile).contactSuccess||t.sent;button.textContent=t.send;
  }catch{status.textContent=ui.error;button.textContent=ui.retry}
  finally{sending=false;button.disabled=false;inputs.forEach(input=>input.disabled=false);form.removeAttribute('aria-busy')}
 };

 if(!slug||!page.profile?.analytics||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
 const record=async(event,card='')=>{try{const session=cloud?(await cloud.auth.getSession()).data.session:null;await fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({slug,event,card}),keepalive:true})}catch{}};
 if(trackView)record('view');root.addEventListener('click',event=>{const link=event.target.closest('a,[data-video-load],[data-map-load]');const card=link?.closest('[data-id]');if(card)record('click',card.dataset.id)});
}

function contactInputs(fields,esc,t,editing=false){return cleanFields(fields).map(field=>{const label=['name','email','message'].includes(field.id)&&field.label===({name:'Name',email:'Email',message:'Message'}[field.id])?t[field.id]:field.label;const attrs='name="'+esc(field.id)+'" '+(field.required?'required':'');const input=field.type==='textarea'?'<textarea '+attrs+' rows="4" maxlength="5000"></textarea>':field.type==='select'?'<select '+attrs+'><option value="">&mdash;</option>'+field.options.map(option=>'<option>'+esc(option)+'</option>').join('')+'</select>':'<input '+attrs+' type="'+field.type+'" '+(field.type==='checkbox'?'': 'maxlength="'+(field.type==='email'?254:500)+'"')+'>';return '<label '+(editing?'data-edit-contact-field="'+esc(field.id)+'" tabindex="0" role="button" ':'')+'class="'+(field.type==='checkbox'?'setting-toggle':'')+'">'+(field.type==='checkbox'?input:'')+esc(label)+(field.required?' *':'')+(field.type==='checkbox'?'':input)+'</label>'}).join('')}
