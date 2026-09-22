import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationFingerprint as fingerprint} from '../src/publication-state.js';
test('publication comparison ignores editor state and hidden cards but detects public changes',async()=>{
 const original={name:'Jane',cards:[{id:'a',type:'text',title:'Hello'}]};
 const same={...original,editorTheme:'light',onboarding:{preview:true},cards:[{...original.cards[0],id:'loaded-0'},{type:'text',hidden:true,title:'Private'}]};
 assert.equal(await fingerprint(original,'owner'),await fingerprint(same,'owner'));
 same.cards[0].title='Changed';assert.notEqual(await fingerprint(original,'owner'),await fingerprint(same,'owner'));
});
test('uploaded and signed media compare with stored object paths',async()=>{
 const data='data:image/webp;base64,YWJj';
 const bytes=await(await fetch(data)).arrayBuffer();
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
 const local={name:'Jane',cards:[{type:'photo',image:data}]};
 const stored={name:'Jane',cards:[{type:'photo',imagePath:'owner/'+hash+'.webp',image:'https://example.com/signed?token=expires'}]};
 assert.equal(await fingerprint(local,'owner'),await fingerprint(stored,'owner'));
});
