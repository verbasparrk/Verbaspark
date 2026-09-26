import {icon} from './icons.js';

// Page-level destinations stay separate from the editor's Blocks, Design, and Edit tabs.
export const workspaceSections=[
 ['blocks','Content','gallery'],
 ['design','Design','design'],
 ['dashboard','My page','project'],
 ['inbox','Inbox','contact'],
 ['analytics','Stats','gallery']
];

export function mountWorkspaceNavigation(){
 const nav=document.createElement('nav');
 nav.className='primary-navigation';
 nav.setAttribute('aria-label','Page tools');
 for(const [id,label,glyph] of workspaceSections.slice(2)){
  const button=document.createElement('button');
  button.id=id;
  button.type='button';
  button.dataset.mainSection=id;
  button.innerHTML=icon(glyph)+'<span>'+label+'</span>';
  nav.append(button);
 }
 document.querySelector('.topbar').after(nav);
}
