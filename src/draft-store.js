const DB='verbaspark-recovery',STORE='snapshots',FALLBACK='verbaspark-recovery-v2';
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Recovery storage is blocked by another tab.'))})}
async function transaction(mode,fn){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);let result;fn(tx.objectStore(STORE),value=>{result=value});tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('Storage write failed.'));tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
const valid=row=>row?.document&&Array.isArray(row.document.cards)&&typeof row.id==='string'&&Number.isFinite(row.time)&&row.document.cards.every(card=>card&&typeof card==='object'&&typeof card.id==='string'&&typeof card.title==='string'&&['intro','photo','gallery','project','text','contact','link','video','document','catalog','audio','location'].includes(card.type));
export class DraftStore{
 async clear(){let failure;try{await transaction('readwrite',store=>store.clear())}catch(error){failure=error}for(const key of [FALLBACK,'verbaspark-v1','verbaspark-welcome-dismissed'])try{localStorage.removeItem(key)}catch(error){failure ||= error}if(failure)throw failure}
 async list(){let rows=[];try{rows=await transaction('readonly',(store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result)})}catch{}
  try{const row=JSON.parse(localStorage.getItem(FALLBACK));if(valid(row)&&!rows.some(r=>r.id===row.id))rows.push(row)}catch{}
  return rows.filter(valid).sort((a,b)=>b.time-a.time).slice(0,6);
 }
 async write(row){
  try{await transaction('readwrite',(store)=>{store.put(row);const request=store.getAll();request.onsuccess=()=>{const rows=request.result.sort((a,b)=>b.time-a.time);for(const old of rows.slice(6))store.delete(old.id)}});try{localStorage.removeItem(FALLBACK);localStorage.removeItem('verbaspark-v1')}catch{}return 'device';}
  catch(error){try{localStorage.setItem(FALLBACK,JSON.stringify(row));return 'fallback'}catch{throw error}}
 }
}
