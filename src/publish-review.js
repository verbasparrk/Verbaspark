import {imageSource} from './photos.js';
import {fileSource} from './files.js';
import {locationURLs} from './media.js';

export function validDestination(value){
 if(/^mailto:/i.test(value||''))return /^[^\s@<>?]+@[^\s@<>?]+\.[^\s@<>?]+$/.test(value.slice(7).split('?')[0]);
 try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')}catch{return false}
}
export function reviewPage(state){
 const issues=[],cards=state.cards.filter(c=>!c.hidden);
 const add=(severity,message,card,field)=>issues.push({severity,message,cardId:card?.id,label:card?.title||'Untitled '+(card?.type||'page'),field});
 if(!state.name?.trim())add('error','Give your page a name.',null,'page-name');
 if(!cards.length)add('error','Add or show at least one block.',null,'blocks');
 for(const card of cards){
  const title=card.title?.trim(),body=card.body?.trim();
  if(!title&&!['photo','gallery'].includes(card.type))add('warning','Add a title so visitors know what this block contains.',card,'card-title');
  if(card.type==='text'&&!title&&!body)add('error','This text block is empty.',card,'card-body');
  if(card.type==='intro'&&!body)add('warning','Add a short introduction.',card,'card-body');
  if(['Your name','My latest project','My document','My catalog','A favorite link'].includes(title)||body==='Click to make this your own.')add('warning','Replace the starter text with your own content.',card,body==='Click to make this your own.'?'card-body':'card-title');
  if(['link','project','video','contact'].includes(card.type)||card.url){if(!validDestination(card.url))add('error','Add a valid website URL or email address.',card,'card-url');else if(/https?:\/\/(?:www\.)?example\.com(?:[/?#]|$)/i.test(card.url)||/@example\.com(?:\?|$)/i.test(card.url))add('warning','This destination is an example. Replace it before sharing.',card,'card-url')}
  if(card.type==='photo'&&!imageSource(card.image))add('error',card.imagePath?'Photo access is unavailable. Load your online draft to refresh it.':'Add a photo or hide this block.',card,'photo-upload');
  if(card.type==='gallery'){if(!card.images?.length)add('error','Add photos or hide this empty gallery.',card,'gallery-upload');else if(card.images.some(p=>!imageSource(p.image)))add('error','Some gallery photos are unavailable. Replace them or refresh your online draft.',card,'gallery-upload')}
  if(['document','catalog','audio'].includes(card.type)&&!fileSource(card.file?.src))add('error',card.file?.path?'File access is unavailable. Load your online draft to refresh it.':'Upload a file or add a direct file link.',card,'file-upload');
  if(card.type==='catalog'&&!imageSource(card.image))add('warning','Add a cover image to help your catalog stand out.',card,'photo-upload');
  if(card.type==='location'){const location=locationURLs(card);if(!location)add('error','Add an address or a map location.',card,'location-address');else if(card.mapMode!=='link'&&!location.embed)add('warning','Only navigation is available. Add a map embed, or choose navigation only.',card,'map-embed')}
 }
 return {issues,errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length,visible:cards.length,hidden:state.cards.length-cards.length};
}

export function openPublishReview(state,{fix,proceed,cancel=()=>{},connected=false}){
 const report=reviewPage(state),dialog=document.createElement('dialog');dialog.className='publish-review';dialog.setAttribute('aria-label','Review before publishing');
 const close=document.createElement('button');close.className='review-close';close.textContent='Close';close.setAttribute('aria-label','Close publication review');
 const title=document.createElement('h2');title.textContent='Ready to share?';
 const summary=document.createElement('p');summary.className='review-summary';summary.textContent=report.errors?`${report.errors} ${report.errors===1?'issue needs':'issues need'} fixing before publishing.`:report.warnings?`${report.warnings} suggestions to review. You can still continue.`:'Your page passed the content checks.';
 const counts=document.createElement('p');counts.className='hint';counts.textContent=`${report.visible} public blocks · ${report.hidden} hidden blocks excluded`;
 const list=document.createElement('div');list.className='review-list';
 report.issues.sort((a,b)=>Number(a.severity!=='error')-Number(b.severity!=='error')).forEach(issue=>{const row=document.createElement('button');row.className='review-item '+issue.severity;const label=document.createElement('strong');label.textContent=issue.cardId?issue.label:'Your page';const message=document.createElement('span');message.textContent=issue.message;const badge=document.createElement('small');badge.textContent=issue.severity==='error'?'Fix required →':'Suggestion →';row.append(badge,label,message);row.onclick=()=>{dialog.close();fix(issue)};list.append(row)});
 const scope=document.createElement('p');scope.className='hint';scope.textContent='Checks content and link format. External websites and remote files are not contacted.';
 const note=document.createElement('p');note.className='review-connection';note.textContent=connected?'Continuing opens publishing. Your live page changes only when you publish.':'Online publishing still needs a Supabase connection. You can fix your page and use HTML export locally.';
 const action=document.createElement('button');action.id='review-continue';action.className='primary';action.textContent='Continue to publishing';action.disabled=report.errors>0;let continued=false;
 action.onclick=()=>{continued=true;dialog.close();proceed()};close.onclick=()=>dialog.close();dialog.onclose=()=>{dialog.remove();if(!continued)cancel()};
 dialog.append(close,title,summary,counts,list,scope,note,action);document.body.append(dialog);dialog.showModal();return dialog;
}
