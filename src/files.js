export const FILE_LIMIT=20*1024*1024,PAGE_FILE_LIMIT=50*1024*1024;
export const fileTypes={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',txt:'text/plain',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'};
export const bytesLabel=n=>n>=1048576?`${(n/1048576).toFixed(1)} MB`:`${Math.ceil(n/1024)} KB`;
export const pageFileBytes=state=>state.cards.reduce((total,c)=>total+(Number(c.file?.size)||0),0);
export function fileSource(value){
 if(typeof value!=='string')return '';
 if(/^https?:\/\//i.test(value)){try{const url=new URL(value);const secure=url.protocol==='https:'||['127.0.0.1','localhost','[::1]'].includes(url.hostname);return secure&&!url.username&&!url.password?url.href:''}catch{return ''}}
 const match=value.match(/^data:([^;,]+);base64,([a-z0-9+/]*={0,2})$/i);
 return match&&Object.values(fileTypes).includes(match[1])&&match[2].length<=Math.ceil(FILE_LIMIT/3)*4?value:'';
}
export function cleanFile(file){
 if(!file||typeof file!=='object')return undefined;
 const mime=Object.values(fileTypes).includes(file.mime)?file.mime:'';if(!mime)return undefined;
 const src=fileSource(file.src),path=typeof file.path==='string'&&/^[a-f0-9-]{36}\/[a-f0-9]{64}\.[a-z0-9]+$/.test(file.path)?file.path:undefined;
 if(!src&&!path)return undefined;
 return {name:String(file.name||'Download').replace(/[\x00-\x1f/\\]/g,'_').slice(0,180),mime,size:Math.max(0,Math.min(FILE_LIMIT,Number(file.size)||0)),src,...(path?{path}:{})};
}
export async function prepareFile(file,state,replacingId){
 const ext=file.name.split('.').pop().toLowerCase(),mime=fileTypes[ext];
 if(!mime)throw Error('Choose PDF, DOCX, XLSX, PPTX, TXT, MP3, WAV, OGG, or M4A.');
 if(!file.size||file.size>FILE_LIMIT)throw Error('Choose a non-empty file under 20 MB.');
 const used=pageFileBytes(state)-(replacingId?state.cards.find(c=>c.id===replacingId)?.file?.size||0:0);
 if(used+file.size>PAGE_FILE_LIMIT)throw Error('Files on this page can total up to 50 MB. Remove or replace a file first.');
 const head=new Uint8Array(await file.slice(0,16).arrayBuffer()),ascii=String.fromCharCode(...head);
 const valid=ext==='pdf'?ascii.startsWith('%PDF-'):['docx','xlsx','pptx'].includes(ext)?ascii.startsWith('PK'):ext==='wav'?ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WAVE':ext==='ogg'?ascii.startsWith('OggS'):ext==='m4a'?ascii.slice(4,8)==='ftyp':ext==='mp3'?ascii.startsWith('ID3')||(head[0]===255&&(head[1]&224)===224):!head.includes(0);
 if(!valid)throw Error('This file does not match its extension. Choose a valid document or audio file.');
 const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(`data:${mime};base64,${String(reader.result).split(',')[1]}`);reader.onerror=()=>reject(Error('Could not read this file.'));reader.readAsDataURL(file)});
 return {name:file.name.slice(0,180),mime,size:file.size,src};
}
