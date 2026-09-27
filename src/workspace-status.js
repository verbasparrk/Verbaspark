import {cloud} from './cloud.js';
import {publicationFingerprint} from './publication-state.js';

// One visible publication state for the editor. Save & recovery continues to
// report whether the private draft is safely stored.
export function createWorkspaceStatus(getState){
 let owner=null,row=null,checkedAt=0,version=0,timer=null,lastDraft='',lastResult='';
 const button=()=>document.querySelector('#page-state');
 const show=(label,state,description,published=false)=>{
  const el=button();if(!el)return;
  el.textContent=label;el.dataset.state=state;el.title=description;el.setAttribute('aria-label',`${label}. ${description} Open page overview.`);
  const canvas=document.querySelector('[data-canvas-publication]');if(canvas){canvas.textContent=state==='live'?(label==='Live'?'LIVE':'CHANGES'):state==='hidden'?'HIDDEN':state==='private'?'PRIVATE':'CHECKING';canvas.dataset.state=state}
  const guide=document.querySelector('.first-steps');if(guide)guide.hidden=published;
 };
 const refresh=({force=false}={})=>{
  clearTimeout(timer);const current=++version;
  const guide=document.querySelector('.first-steps');if(guide&&row)guide.hidden=true;
  timer=setTimeout(async()=>{
   if(!button())return;
   try{
    if(!cloud){show('Private draft','private','This page is only on this device. Sign in to publish.');return}
    const {data,error}=await cloud.auth.getSession();if(error)throw error;if(current!==version)return;
    const user=data.session?.user;
    if(!user){owner=null;row=null;show('Private draft','private','Only you can see this draft. Sign in to publish.');return}
    if(force||owner!==user.id||Date.now()-checkedAt>30000){
     const result=await cloud.from('published_pages').select('slug,document,moderated_at').eq('owner_id',user.id).maybeSingle();
     if(result.error)throw result.error;if(current!==version)return;
     owner=user.id;row=result.data;checkedAt=Date.now();lastDraft='';
    }
    if(!row){show('Private draft','private','Your page is not public yet. Publish it when ready.');return}
    if(row.moderated_at){show('Page hidden','hidden','This page is not public. Open My page for details.',true);return}
    const draft=JSON.stringify(getState());
    if(draft!==lastDraft){lastResult=await publicationFingerprint(getState(),user.id);lastDraft=draft}
    if(current!==version)return;
    const live=await publicationFingerprint(row.document,user.id);if(current!==version)return;
    const changed=lastResult!==live;
    show(changed?'Unpublished changes':'Live','live',changed?'Visitors still see your last published version. Publish again to share your changes.':'Visitors see this version of your page.',true);
   }catch{if(current===version)show('Status unavailable','unknown','Open My page to check your publication status.')}
  },force?0:250);
 };
 cloud?.auth.onAuthStateChange(()=>setTimeout(()=>refresh({force:true}),0));
 window.addEventListener('verbaspark:publication-changed',()=>refresh({force:true}));
 return {refresh};
}
