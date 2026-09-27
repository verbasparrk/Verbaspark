import {icon} from './icons.js';
export function starterNotice(state){
 if(!state.starterSample||state.name!=='Alex Morgan')return '';
 return `<section class="starter-notice" aria-label="Example page"><div><strong>This is an example page.</strong><p>Alex Morgan and these cards are sample content. Add your own details before publishing.</p></div><button id="start-my-page" type="button">Set up my page ${icon('arrow')}</button></section>`;
}
export function firstSteps(state){const progress=state.onboarding||{};if(progress.dismissed)return '';
 const steps=[['name','Add your name','Use your own name or page title.','intro'],['link','Add a link','Give visitors somewhere to go.','link'],['preview','Preview your page','See what visitors will see.','eye']];
 const done=steps.filter(([id])=>progress[id]).length;
 const next=steps.find(([id])=>!progress[id]);
 const [id,label,detail,glyph]=next||['publish','Review and publish','Your private draft is ready to share.','arrow'];
 return `<section class="first-steps" aria-label="Next step"><div><strong>${next?'One step at a time':'Ready to share'}</strong><span>${done} of 3 basics done</span><button id="dismiss-steps" aria-label="Dismiss getting started">${icon('close')}</button></div><p>${detail}</p><button class="first-step-next" data-first-step="${id}">${icon(glyph)}<span>${label}</span></button></section>`;
}
export function markProgress(state,previous){const progress=state.onboarding||{};
 if(state.name!==previous.name&&state.name?.trim())progress.name=true;
 const oldIntro=previous.cards.find(c=>c.type==='intro'),intro=state.cards.find(c=>c.type==='intro');if(intro?.title&&intro.title!==oldIntro?.title)progress.name=true;
 const before=new Map(previous.cards.map(c=>[c.id,c]));if(state.cards.some(c=>c.image&&c.image!==before.get(c.id)?.image||c.images?.some(p=>p.image?.startsWith('data:'))&&!before.get(c.id)?.images?.length))progress.photo=true;
 if(state.cards.some(c=>c.url&&c.url!==before.get(c.id)?.url&&/^https?:|^mailto:/i.test(c.url)))progress.link=true;state.onboarding=progress;
}
