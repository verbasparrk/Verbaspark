// Same content-aware grid for the editor, public pages, and standalone exports.
export function bentoRuntime(){
 window.__bentoObservers=(window.__bentoObservers||[]).filter(item=>{if(item.grid.isConnected)return true;item.stop();return false});
 document.querySelectorAll('.personal-page:not(.classic-page):not(.editorial-page):not(.showcase-page) .bento').forEach(grid=>{if(grid.dataset.measured)return;grid.dataset.measured='true';let frame=0;
 const layout=()=>{frame=0;if(!grid.isConnected)return;const gap=parseFloat(getComputedStyle(grid).rowGap)||0;for(const card of grid.children){const height=card.getBoundingClientRect().height;card.style.gridRowEnd='span '+Math.max(1,Math.ceil((height+gap)/(8+gap)))}};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout)};
 const observer=new ResizeObserver(schedule);observer.observe(grid);const observe=()=>{for(const card of grid.children)observer.observe(card);schedule()};observe();const mutation=new MutationObserver(observe);mutation.observe(grid,{childList:true});window.__bentoObservers.push({grid,stop:()=>{observer.disconnect();mutation.disconnect();cancelAnimationFrame(frame)}});
 });
}
