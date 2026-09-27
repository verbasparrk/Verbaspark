import test from 'node:test';
import assert from 'node:assert/strict';
import {videoEmbed,locationURLs,mediaHTML,fileFromURL} from '../src/media.js';
import {cleanFile,fileSource,prepareFile,pageFileBytes,FILE_LIMIT,PAGE_FILE_LIMIT} from '../src/files.js';
import {cleanPage} from '../src/page-data.js';
import {mapEmbedSource,mapEmbedCoordinates,addressEmbed,mapTiles} from '../src/maps.js';
import {photonSuggestions} from '../server/geocode.js';
import coverHandler from '../api/cover.js';
test('map sources restrict embeds and encode address-based maps',()=>{
 assert.equal(mapEmbedSource('<iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>'),'https://www.google.com/maps/embed?pb=abc');
 assert.equal(mapEmbedSource('https://www.google.com.evil.test/maps/embed?pb=abc'),'');
 assert.equal(mapEmbedSource('javascript:alert(1)'),'');
 assert.deepEqual(mapEmbedCoordinates('https://www.google.com/maps/embed?pb=!3d46.0569!4d14.5058'),[14.5058,46.0569]);
 assert.equal(mapEmbedCoordinates('https://www.google.com/maps/embed?pb=!3d96!4d14'),null);
 assert.equal(new URL(addressEmbed('Semič & center','test-key')).searchParams.get('q'),'Semič & center');
 assert.equal(addressEmbed('Ljubljana',''),'');
});
test('media URLs accept only supported providers and safe file data',()=>{
 assert.equal(videoEmbed('https://youtube.com/watch?v=dQw4w9WgXcQ').url,'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');assert.equal(videoEmbed('https://vimeo.com/12345/abcdef').url,'https://player.vimeo.com/video/12345?h=abcdef');
 for(const url of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://vimeo.com/invalid','https://evil.test/video'])assert.equal(videoEmbed(url),null);
 assert.equal(fileSource('data:text/html;base64,PHNjcmlwdD4='),'');assert.equal(fileSource('javascript:alert(1)'),'');assert.equal(cleanFile({mime:'text/html',src:'https://example.com/x.html'}),undefined);assert.throws(()=>fileFromURL('https://example.com/file.pdf','audio'));
 assert.equal(locationURLs({address:'Ljubljana & center'}).directions,'https://www.google.com/maps/dir/?api=1&destination=Ljubljana%20%26%20center');assert.equal(locationURLs({latitude:'',longitude:''}),null);
 assert.deepEqual(locationURLs({latitude:46.0569,longitude:14.5058}).coordinates,[14.5058,46.0569]);
 assert.deepEqual(locationURLs({mapEmbed:'https://www.openstreetmap.org/export/embed.html?bbox=14,46,15,47&marker=46.0569%2C14.5058'}).coordinates,[14.5058,46.0569]);
 const location={type:'location',title:'Find me',address:'Ljubljana',latitude:46.0569,longitude:14.5058};
 assert.match(mediaHTML(location,value=>value,false),/class="static-map"/);
 assert.match(mediaHTML(location,value=>value,false,true),/OpenStreetMap contributors/);
 assert.doesNotMatch(mediaHTML(location,value=>value,false),/<iframe/);
});
test('small map preview uses nine nearby tiles and geocoder results are safe and limited',()=>{
 const tiles=mapTiles(14.5058,46.0569);
 assert.equal(tiles.length,9);assert.ok(tiles.every(tile=>/^https:\/\/tile\.openstreetmap\.org\/14\/\d+\/\d+\.png$/.test(tile.url)));
 const suggestions=photonSuggestions({features:[{geometry:{coordinates:[14.5058,46.0569]},properties:{street:'Vajdova cesta',housenumber:'23',city:'Semič',country:'Slovenia'}},{geometry:{coordinates:[Infinity,46]},properties:{name:'Invalid'}}]});
 assert.deepEqual(suggestions,[{label:'Vajdova cesta 23, Semič, Slovenia',lng:14.5058,lat:46.0569}]);
});
test('address search shares an existing API function and rejects short queries',async()=>{
 let status,output;
 const response={status(code){status=code;return this},json(value){output=value;return this},end(){return this}};
 await coverHandler({method:'GET',query:{geocode:'1',q:'a'}},response);
 assert.equal(status,400);assert.match(output.error,/at least 3 characters/);
});
test('new blocks and attachments survive document sanitization',()=>{
 const page=cleanPage({cards:[{type:'document',title:'PDF',file:{name:'cv.pdf',size:10,mime:'application/pdf',src:'data:application/pdf;base64,JVBERi0='}},{type:'location',address:'Ljubljana',latitude:46,longitude:14},{type:'audio'},{type:'catalog'}]});
 assert.equal(page.cards[0].file.name,'cv.pdf');assert.equal(page.cards[1].latitude,46);assert.equal(page.cards[2].type,'audio');assert.equal(page.cards[3].type,'catalog');
});
test('catalog collections retain safe PDF files and count every upload',()=>{
 const source='data:application/pdf;base64,JVBERi0=';
 const page=cleanPage({cards:[{type:'catalog',catalogMode:'collection',file:{name:'First.pdf',mime:'application/pdf',size:100,src:source},catalogs:[{name:'Second.pdf',mime:'application/pdf',size:200,src:source},{name:'unsafe.html',mime:'text/html',size:500,src:'https://example.com/unsafe.html'}]}]});
 assert.equal(page.cards[0].catalogMode,'collection');assert.deepEqual(page.cards[0].catalogs.map(file=>file.name),['Second.pdf']);assert.equal(pageFileBytes(page),300);
 assert.match(mediaHTML(page.cards[0],value=>value,false),/catalog-slide/);
});
test('file and page upload limits reject before reading data',async()=>{
 await assert.rejects(prepareFile({name:'large.pdf',size:FILE_LIMIT+1},{cards:[]}),/under 20 MB/);
 await assert.rejects(prepareFile({name:'next.pdf',size:100},{cards:[{file:{size:PAGE_FILE_LIMIT}}]}),/up to 50 MB/);
 await assert.rejects(prepareFile({name:'script.html',size:20},{cards:[]}),/Choose PDF/);
});
