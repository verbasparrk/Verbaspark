import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSlug,validSlug} from '../src/slug.js';

test('public usernames normalize names with spaces and diacritics to database-safe slugs',()=>{
 assert.equal(normalizeSlug('Marko Cipurić'),'marko-cipuric');
 assert.equal(normalizeSlug('  Ægir & ßØ  '),'aegir-sso');
 assert.equal(normalizeSlug('Jana—Portfolio 2026'),'jana-portfolio-2026');
 assert.equal(validSlug('marko-cipuric'),true);
 assert.equal(validSlug('Marko Cipurić'),false);
 assert.equal(validSlug('a'),false);
 assert.equal(validSlug(normalizeSlug('!@#$')),false);
 assert.equal(normalizeSlug('x'.repeat(35)),'x'.repeat(30));
});
