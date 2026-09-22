import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPage,validDestination} from '../src/publish-review.js';
test('review detects missing resources and unsafe destinations but excludes hidden blocks',()=>{
 const report=reviewPage({name:'Alex',cards:[{id:'1',type:'gallery',images:[]},{id:'2',type:'document',title:'CV'},{id:'3',type:'link',title:'Website',url:'javascript:alert(1)'},{id:'4',type:'photo',hidden:true}]});
 assert.equal(report.errors,3);assert.equal(report.hidden,1);assert.deepEqual(report.issues.filter(i=>i.severity==='error').map(i=>i.field),['gallery-upload','file-upload','card-url']);
 assert.equal(validDestination('mailto:'),false);assert.equal(validDestination('mailto:alex@domain.com'),true);assert.equal(validDestination('https://user:pass@domain.com'),false);
});
test('review distinguishes suggestions from blockers and permits simple text profiles',()=>{
 assert.equal(reviewPage({name:'Alex',cards:[{id:'a',type:'text',title:'About me',body:'Hello'}]}).issues.length,0);
 assert.equal(reviewPage({name:'Alex',cards:[{type:'link',title:'Sample',url:'https://example.com'}]}).errors,0);
 assert.equal(reviewPage({name:'Alex',cards:[{type:'link',title:'Sample',url:'https://example.com'}]}).warnings,1);
 assert.equal(reviewPage({name:'',cards:[]}).errors,2);
});
