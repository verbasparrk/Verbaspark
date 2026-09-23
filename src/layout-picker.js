export const layouts={bento:'Bento',classic:'Classic',editorial:'Editorial',showcase:'Showcase'};
let cssPromise;
export function layoutPicker(state){return `<fieldset class="layout-picker"><legend>Page layout</legend><p class="hint">Preview your current content. Choosing a layout keeps your cards.</p><div class="layout-picker-grid">${Object.entries(layouts).map(([id,label])=>`<button type="button" data-layout-choice="${id}" aria-pressed="${(state.layout||'bento')===id}"><span class="layout-thumbnail"><iframe title="${label} preview of your page" tabindex="-1" sandbox="" loading="lazy"></iframe></span><strong>${label}</strong></button>`).join('')}</div></fieldset>`}
export async function mountLayoutPreviews(state,pageHTML,styleString){
 const root=document.querySelector('.layout-picker');if(!root)return;
 cssPromise??=import('./style.css?inline').then(module=>module.default);
 const css=await cssPromise;if(!root.isConnected)return;
 for(const [id,label] of Object.entries(layouts)){
  const frame=root.querySelector(`[data-layout-choice="${id}"] iframe`);
  const sample={...state,layout:id,cards:state.cards.filter(c=>!c.hidden)};
  frame.srcdoc=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}html,body{overflow:hidden}body.export-page{width:800px;margin:0;min-height:600px}.personal-page{min-height:600px}</style></head><body class="export-page" style="${styleString(sample).replaceAll('"','&quot;')}">${pageHTML(false,sample)}</body></html>`;
  frame.title=`${label} preview of your page`;
 }
}
