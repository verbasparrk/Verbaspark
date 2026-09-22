import {icon} from './icons.js';
export function firstSteps(state){const progress=state.onboarding||{};const steps=[['name','Your name'],['photo','A photo'],['link','A link'],['preview','Preview']];if(progress.dismissed||steps.every(([id])=>progress[id]))return '';
 return `<section class="first-steps" aria-label="Getting started"><div><strong>Make yourself at home.</strong><span>${steps.filter(([id])=>progress[id]).length} of 4 ready</span><button id="dismiss-steps" aria-label="Dismiss getting started">${icon('close')}</button></div><div class="first-step-buttons">${steps.map(([id,label])=>`<button data-first-step="${id}" ${progress[id]?'disabled':''}>${icon(progress[id]?'check':{name:'intro',photo:'photo',link:'link',preview:'eye'}[id])}<span>${label}</span></button>`).join('')}</div></section>`;
}
export function markProgress(state,previous){const progress=state.onboarding||{};
 if(state.name!==previous.name&&state.name?.trim())progress.name=true;
 const oldIntro=previous.cards.find(c=>c.type==='intro'),intro=state.cards.find(c=>c.type==='intro');if(intro?.title&&intro.title!==oldIntro?.title)progress.name=true;
 const before=new Map(previous.cards.map(c=>[c.id,c]));if(state.cards.some(c=>c.image&&c.image!==before.get(c.id)?.image||c.images?.some(p=>p.image?.startsWith('data:'))&&!before.get(c.id)?.images?.length))progress.photo=true;
 if(state.cards.some(c=>c.url&&c.url!==before.get(c.id)?.url&&/^https?:|^mailto:/i.test(c.url)))progress.link=true;state.onboarding=progress;
}
