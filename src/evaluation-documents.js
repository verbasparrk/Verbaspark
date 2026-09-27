import {newBlock} from './content-library.js';
import {prepareFile} from './files.js';

export async function prepareEvaluationDocuments(files,state,createSection){
 const list=Array.from(files||[]);
 if(!list.length)return [];
 if(list.some(file=>!/\.pdf$/i.test(file.name)))throw Error('Choose PDF files for your evaluations.');
 if(state.cards.length+list.length+(createSection?1:0)>100)throw Error('Your page can contain up to 100 blocks. Remove a block before adding these PDFs.');
 const staged={cards:[...state.cards]},documents=[];
 for(const file of list){
  const ready=await prepareFile(file,staged);
  const title=file.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').trim()||'Evaluation';
  const card=newBlock('document',{title,file:ready});
  documents.push(card);staged.cards.push(card);
 }
 return documents;
}

export function insertEvaluationDocuments(state,documents,sectionId){
 if(!documents.length)return;
 let sectionIndex=state.cards.findIndex(card=>card.id===sectionId&&card.type==='section');
 if(sectionId&&sectionIndex<0)throw Error('This section is no longer available. Choose it again.');
 if(sectionIndex<0){sectionIndex=state.cards.length;state.cards.push(newBlock('section',{title:'Past evaluations'}))}
 const nextSection=state.cards.findIndex((card,index)=>index>sectionIndex&&card.type==='section');
 state.cards.splice(nextSection<0?state.cards.length:nextSection,0,...documents);
}
