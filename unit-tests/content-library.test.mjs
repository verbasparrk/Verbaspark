import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,duplicateBlock,publicDocument} from '../src/content-library.js';
import {cleanPage} from '../src/page-data.js';
test('duplicated content has independent nested data and a new identity',()=>{
 const source=newBlock('gallery',{images:[{caption:'Original',image:'data:image/png;base64,AA=='}],hidden:true});const copy=duplicateBlock(source);copy.images[0].caption='Changed';assert.equal(source.images[0].caption,'Original');assert.notEqual(copy.id,source.id);assert.equal(copy.hidden,true);
 assert.equal(duplicateBlock(newBlock('photo',{photoRole:'cover'})).photoRole,'content');
});
test('hidden state survives sanitization and public documents omit hidden assets',()=>{
 const state={cards:[newBlock('text',{hidden:true,body:'PRIVATE'}),newBlock('text',{body:'PUBLIC'})]};assert.equal(cleanPage(state).cards[0].hidden,true);assert.equal(publicDocument(state).cards.length,1);assert.equal(JSON.stringify(publicDocument(state)).includes('PRIVATE'),false);assert.equal(state.cards.length,2);
});
