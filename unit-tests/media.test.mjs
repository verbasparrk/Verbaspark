import test from 'node:test';
import assert from 'node:assert/strict';
import {videoEmbed,locationURLs,fileFromURL} from '../src/media.js';
import {cleanFile,fileSource,prepareFile,FILE_LIMIT,PAGE_FILE_LIMIT} from '../src/files.js';
import {cleanPage} from '../src/page-data.js';
import {mapEmbedSource,addressEmbed} from '../src/maps.js';
test('map sources restrict embeds and encode address-based maps',()=>{
 assert.equal(mapEmbedSource('<iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>'),'https://www.google.com/maps/embed?pb=abc');
 assert.equal(mapEmbedSource('https://www.google.com.evil.test/maps/embed?pb=abc'),'');
 assert.equal(mapEmbedSource('javascript:alert(1)'),'');
 assert.equal(new URL(addressEmbed('Semič & center','test-key')).searchParams.get('q'),'Semič & center');
 assert.equal(addressEmbed('Ljubljana',''),'');
});
test('media URLs accept only supported providers and safe file data',()=>{
 assert.equal(videoEmbed('https://youtube.com/watch?v=dQw4w9WgXcQ').url,'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');assert.equal(videoEmbed('https://vimeo.com/12345/abcdef').url,'https://player.vimeo.com/video/12345?h=abcdef');
 for(const url of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://vimeo.com/invalid','https://evil.test/video'])assert.equal(videoEmbed(url),null);
 assert.equal(fileSource('data:text/html;base64,PHNjcmlwdD4='),'');assert.equal(fileSource('javascript:alert(1)'),'');assert.equal(cleanFile({mime:'text/html',src:'https://example.com/x.html'}),undefined);assert.throws(()=>fileFromURL('https://example.com/file.pdf','audio'));
 assert.equal(locationURLs({address:'Ljubljana & center'}).directions,'https://www.google.com/maps/dir/?api=1&destination=Ljubljana%20%26%20center');assert.equal(locationURLs({latitude:'',longitude:''}),null);
});
test('new blocks and attachments survive document sanitization',()=>{
 const page=cleanPage({cards:[{type:'document',title:'PDF',file:{name:'cv.pdf',size:10,mime:'application/pdf',src:'data:application/pdf;base64,JVBERi0='}},{type:'location',address:'Ljubljana',latitude:46,longitude:14},{type:'audio'},{type:'catalog'}]});
 assert.equal(page.cards[0].file.name,'cv.pdf');assert.equal(page.cards[1].latitude,46);assert.equal(page.cards[2].type,'audio');assert.equal(page.cards[3].type,'catalog');
});
test('file and page upload limits reject before reading data',async()=>{
 await assert.rejects(prepareFile({name:'large.pdf',size:FILE_LIMIT+1},{cards:[]}),/under 20 MB/);
 await assert.rejects(prepareFile({name:'next.pdf',size:100},{cards:[{file:{size:PAGE_FILE_LIMIT}}]}),/up to 50 MB/);
 await assert.rejects(prepareFile({name:'script.html',size:20},{cards:[]}),/Choose PDF/);
});
