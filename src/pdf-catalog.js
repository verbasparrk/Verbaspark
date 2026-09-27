import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

export function mountPdfCatalogs(){
 for(const root of document.querySelectorAll('[data-pdf-catalog]:not([data-mounted])')){
  root.dataset.mounted='true';
  const canvas=root.querySelector('canvas'),status=root.querySelector('.pdf-catalog-status'),position=root.querySelector('.pdf-catalog-position');
  const previous=root.querySelector('[data-pdf-step="-1"]'),next=root.querySelector('[data-pdf-step="1"]');
  let pdf,current=1,rendering=false,requested=1,activeTask;
  const show=async()=>{
   if(!pdf||rendering||!root.isConnected)return;
   rendering=true;const number=requested;
   try{
    const page=await pdf.getPage(number);
    if(!root.isConnected)return;
    const natural=page.getViewport({scale:1}),width=Math.max(200,root.querySelector('.pdf-catalog-sheet').clientWidth-32);
    const ratio=Math.min(devicePixelRatio||1,2),scale=Math.min(width/natural.width*ratio,4096/Math.max(natural.width,natural.height));
    const viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    canvas.style.aspectRatio=`${viewport.width} / ${viewport.height}`;
    activeTask=page.render({canvasContext:canvas.getContext('2d'),viewport});await activeTask.promise;
    current=number;position.textContent=`${current} / ${pdf.numPages}`;canvas.setAttribute('aria-label',`Catalog page ${current} of ${pdf.numPages}`);
    previous.disabled=current===1;next.disabled=current===pdf.numPages;status.hidden=true;canvas.hidden=false;
   }catch(error){if(root.isConnected){status.hidden=false;status.textContent='This page could not be displayed. Open or download the PDF below.'}}
   finally{activeTask=null;rendering=false;if(requested!==number&&root.isConnected)show()}
  };
  const move=step=>{if(!pdf)return;requested=Math.min(pdf.numPages,Math.max(1,requested+step));show()};
  previous.onclick=()=>move(-1);next.onclick=()=>move(1);
  root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1)}});
  let touchX=0,touchY=0;
  root.addEventListener('touchstart',event=>{if(event.touches.length!==1)return;touchX=event.touches[0].clientX;touchY=event.touches[0].clientY},{passive:true});
  root.addEventListener('touchend',event=>{if(!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)move(dx<0?1:-1)},{passive:true});
  const load=async()=>{
   try{
    const source=root.dataset.src;
    const task=pdfjs.getDocument(source.startsWith('data:')?{data:new Uint8Array(await(await fetch(source)).arrayBuffer())}:{url:source});
    pdf=await task.promise;if(!root.isConnected){await task.destroy();return}
    if(!pdf.numPages)throw Error('Empty PDF');show();
   }catch{if(root.isConnected)status.textContent='Preview unavailable. Open or download the PDF below.'}
  };
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting){observer.disconnect();load()}},{rootMargin:'300px'});observer.observe(root)}else load();
 }
}
