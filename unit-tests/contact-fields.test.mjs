import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanFields,validateAnswers} from '../src/contact-fields.js';
test('custom form validates published types, required fields and choices',()=>{
 const fields=[{id:'service',type:'select',label:'Service',required:true,options:['Photo','Video']},{id:'date',type:'date',label:'Date',required:false},{id:'consent',type:'checkbox',label:'Consent',required:true}];
 assert.throws(()=>validateAnswers(fields,{service:'Other',consent:'on'}),/Service/);assert.throws(()=>validateAnswers(fields,{service:'Photo'}),/Consent/);assert.throws(()=>validateAnswers(fields,{service:'Photo',consent:'on',date:'2026-02-30'}),/Date/);
 const answers=validateAnswers(fields,{service:'Video',date:'2026-10-01',consent:'on',injected:'ignore'});assert.equal(answers.length,3);assert.equal(answers[2].value,true);
});
test('legacy defaults and safe unique IDs survive malicious configuration',()=>{assert.deepEqual(cleanFields().map(f=>f.id),['name','email','message']);const fields=cleanFields([{id:'website',type:'file',label:'Upload'},{id:'email'},{id:'email'}]);assert.equal(new Set(fields.map(f=>f.id)).size,3);assert.notEqual(fields[0].id,'website');assert.equal(fields[0].type,'text')});
