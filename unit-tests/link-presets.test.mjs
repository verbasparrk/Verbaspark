import test from 'node:test';
import assert from 'node:assert/strict';
import {linkTypes} from '../src/link-presets.js';
import {normalizeLink} from '../src/links.js';

test('suggested destinations have unique choices and usable URL examples',()=>{
 assert.ok(linkTypes.length>=40);
 assert.equal(new Set(linkTypes.map(type=>type.id)).size,linkTypes.length);
 for(const type of linkTypes){
  const url=normalizeLink(type.hint,type.id);
  assert.ok(url.startsWith(type.id==='email'?'mailto:':'https://'),type.name);
 }
 assert.equal(linkTypes.find(type=>type.id==='vimeo').type,'video');
 assert.equal(linkTypes.find(type=>type.id==='whatsapp').type,'link');
});
