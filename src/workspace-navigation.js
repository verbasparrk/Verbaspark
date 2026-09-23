import {icon} from './icons.js';
export const workspaceSections=[['blocks','Content','gallery'],['design','Design','design'],['profile-settings','Settings','more'],['inbox','Messages','contact'],['analytics','Analytics','project']];
export function mountWorkspaceNavigation(tab,preview){
 const nav=document.createElement('nav');nav.className='primary-navigation';nav.setAttribute('aria-label','Workspace navigation');
 for(const [id,label,glyph] of workspaceSections){const button=document.createElement('button');button.dataset.mainSection=id;button.innerHTML=icon(glyph)+'<span>'+label+'</span>';if(!preview&&(id===tab||id==='blocks'&&tab==='edit'))button.setAttribute('aria-current','page');button.onclick=()=>document.querySelector(['blocks','design'].includes(id)?`[data-tab="${id}"]`:'#'+id)?.click();nav.append(button)}
 document.querySelector('.topbar').after(nav);
}
