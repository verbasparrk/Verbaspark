import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
function twoPagePdf(){
 const pages=['First page','Second page'],objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',...pages.map((_,i)=>`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 220] /Resources << /Font << /F1 7 0 R >> >> /Contents ${i+5} 0 R >>`),...pages.map(label=>{const stream=`BT /F1 22 Tf 30 120 Td (${label}) Tj ET`;return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`}),'<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>'];
 let output='%PDF-1.4\n';const offsets=[0];objects.forEach((body,index)=>{offsets.push(Buffer.byteLength(output));output+=`${index+1} 0 obj\n${body}\nendobj\n`});const start=Buffer.byteLength(output);output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(const offset of offsets.slice(1))output+=`${String(offset).padStart(10,'0')} 00000 n \n`;output+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(output);
}
const add=async(page,type)=>{await page.locator('[data-tab="blocks"]').click();await page.locator(`[data-add="${type}"]`).click()};
test('PDF and catalog upload, recovery, preview and standalone download',async({page})=>{
 await page.goto('/editor/');await add(page,'catalog');await page.locator('#file-upload').setInputFiles({name:'menu.pdf',mimeType:'application/pdf',buffer:pdf});
 await expect(page.locator('.catalog .file-meta')).toContainText('menu.pdf');
 await page.locator('#card-image').fill('https://images.unsplash.com/photo-1547592180-85f173990554?w=500');await page.locator('#card-image').press('Tab');await expect(page.locator('.catalog .catalog-cover img')).toHaveCount(1);
 await page.reload();await expect(page.locator('.catalog .file-meta')).toContainText('menu.pdf');await page.locator('#preview').click();
 await page.locator('.catalog [data-media="pdf"]').click();await expect(page.locator('.document-dialog')).toBeVisible();await expect(page.locator('.document-dialog iframe')).toHaveAttribute('src',/^blob:/);await page.keyboard.press('Escape');await expect(page.locator('.document-dialog')).toHaveCount(0);
 await page.locator('#preview').click();await page.locator('[data-tab="design"]').click();await page.locator(`[data-layout-choice="${'classic'}"]`).click();await expect(page.locator('.classic-page .catalog .file-meta')).toContainText('menu.pdf');
 await page.locator('#page-menu-toggle').click();const exported=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await (await exported).path(),'utf8');expect(html).toContain('data:application/pdf;base64,');
 await page.setContent(html);await page.locator('[data-media="pdf"]').click();await expect(page.locator('.document-dialog')).toBeVisible();await page.keyboard.press('Escape');
 const downloaded=page.waitForEvent('download');await page.locator('.catalog [data-file-download]').click();expect(await fs.readFile(await (await downloaded).path())).toEqual(pdf);
});
test('catalog PDF pages can be browsed as a slider and retain the full PDF',async({page})=>{
 await page.goto('/editor/');await add(page,'catalog');await page.locator('#file-upload').setInputFiles({name:'catalog.pdf',mimeType:'application/pdf',buffer:twoPagePdf()});
 await page.locator('#catalog-mode').selectOption('slider');await page.locator('.pdf-catalog').scrollIntoViewIfNeeded();await expect(page.locator('.pdf-catalog-position')).toHaveText('1 / 2');
 await page.reload();await page.locator('.card.catalog').click();await expect(page.locator('#catalog-mode')).toHaveValue('slider');await page.locator('#preview').click();
 const catalog=page.locator('.catalog .pdf-catalog');await catalog.scrollIntoViewIfNeeded();await expect(catalog.locator('.pdf-catalog-position')).toHaveText('1 / 2');await expect(catalog.locator('canvas')).toBeVisible();await catalog.locator('[data-pdf-step="1"]').click();await expect(catalog.locator('.pdf-catalog-position')).toHaveText('2 / 2');
 await catalog.focus();await page.keyboard.press('ArrowLeft');await expect(catalog.locator('.pdf-catalog-position')).toHaveText('1 / 2');
 const downloaded=page.waitForEvent('download');await page.locator('.catalog [data-file-download]').click();expect(await fs.readFile(await (await downloaded).path())).toEqual(twoPagePdf());
});
test('several PDF catalogs form one swipeable block and each keeps its own download',async({page})=>{
 const first={name:'summer.pdf',mimeType:'application/pdf',buffer:twoPagePdf()},second={name:'winter.pdf',mimeType:'application/pdf',buffer:twoPagePdf()};
 await page.goto('/editor/');await add(page,'catalog-collection');await expect(page.locator('#catalog-mode')).toHaveValue('collection');
 await page.locator('#catalog-files-upload').setInputFiles([first,second]);await expect(page.locator('.catalog-slide')).toHaveCount(2);
 await expect(page.locator('.catalog-file-row')).toHaveCount(2);await page.locator('[data-catalog-move="0"][data-direction="1"]').click();
 await expect(page.locator('.catalog-slide').first()).toContainText('winter.pdf');await page.reload();await page.locator('.card.catalog').click();
 await expect(page.locator('#catalog-mode')).toHaveValue('collection');await expect(page.locator('.catalog-file-row')).toHaveCount(2);
 await page.locator('#preview').click();const rail=page.locator('.catalog .catalog-items');await rail.scrollIntoViewIfNeeded();await expect(page.locator('.catalog-slide').first().locator('canvas')).toBeVisible();await page.screenshot({path:'test-results/catalog-slider-desktop.png'});
 await expect(page.locator('.catalog .gallery-position')).toHaveText('1 / 2');await page.locator('.catalog [data-gallery-step="1"]').click();await expect(page.locator('.catalog .gallery-position')).toHaveText('2 / 2');
 await page.locator('.catalog-slide').nth(1).locator('[data-media="pdf"]').click();await expect(page.locator('.document-dialog')).toBeVisible();await expect(page.locator('.document-dialog>a')).toHaveAttribute('download','summer.pdf');await page.keyboard.press('Escape');
 const downloaded=page.waitForEvent('download');await page.locator('.catalog-slide').nth(1).locator('[data-file-download]').click();expect(await fs.readFile(await (await downloaded).path())).toEqual(twoPagePdf());
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.catalog .catalog-items')).toBeVisible();await page.locator('.catalog .catalog-items').scrollIntoViewIfNeeded();await expect(page.locator('.catalog-slide').first().locator('canvas')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/catalog-slider-mobile.png'});await page.setViewportSize({width:1280,height:800});
 await page.locator('#preview').click();await page.locator('#page-menu-toggle').click();const exported=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await (await exported).path(),'utf8');await page.setContent(html);await expect(page.locator('.catalog-slide')).toHaveCount(2);await expect(page.locator('.catalog-poster canvas')).toHaveCount(0);
});
test('video and map load only on request; audio remains controllable on phones',async({page})=>{
 await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'<html>Video player</html>',contentType:'text/html'}));await page.route('https://www.openstreetmap.org/**',r=>r.fulfill({body:'<html>Map</html>',contentType:'text/html'}));
 await page.route('https://tiles.openfreemap.org/styles/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#222b38'}}]})}));
 await page.goto('/editor/');await add(page,'video');await page.locator('#card-url').fill('https://youtu.be/dQw4w9WgXcQ');await page.locator('#card-url').press('Tab');
 await add(page,'location');await page.locator('#map-mode').selectOption('click');await page.locator('#location-address').fill('Ljubljana, Slovenia');await page.locator('#location-address').press('Tab');await page.locator('.map-advanced summary').click();await page.locator('#location-latitude').fill('46.0569');await page.locator('#location-latitude').press('Tab');await page.locator('#location-longitude').fill('14.5058');await page.locator('#location-longitude').press('Tab');
 await add(page,'audio');const wav=Buffer.alloc(46);wav.write('RIFF');wav.writeUInt32LE(38,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2,40);
 await page.locator('#file-upload').setInputFiles({name:'hello.wav',mimeType:'audio/wav',buffer:wav});await expect(page.locator('.audio .file-meta')).toContainText('hello.wav');
 await expect(page.locator('.personal-page iframe')).toHaveCount(0);await page.locator('#preview').click();await expect(page.locator('.personal-page iframe')).toHaveCount(0);
 await page.locator('[data-media="video"]').click();await expect(page.locator('.video iframe')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
 await page.locator('[data-media="map"]').click();await expect(page.locator('.location .cooperative-map')).toHaveAttribute('data-map-status','ready');await expect(page.locator('.location .maplibregl-canvas')).toHaveCount(1);await expect(page.locator('.location .map-pin')).toHaveCount(1);await expect(page.locator('.location .media-link')).toHaveAttribute('href',/destination=46.0569%2C14.5058/);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-media="audio"]').click();await expect(page.locator('audio')).toHaveAttribute('controls','');await expect(page.locator('audio')).toHaveAttribute('preload','none');expect(await page.locator('audio').evaluate(el=>el.autoplay)).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.audio').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/media-mobile.png'});
 await page.setViewportSize({width:1280,height:800});await page.locator('#preview').click();await page.locator('#page-menu-toggle').click();const exported=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await (await exported).path(),'utf8');expect(html).not.toContain('<div class="cooperative-map"');await page.setContent(html);await page.locator('.location [data-media="map"]').click();await expect(page.locator('.location iframe')).toHaveAttribute('src',/marker=46.0569%2C14.5058/);
});
test('shared map embeds display immediately, persist and clear when address changes',async({page})=>{
 await page.route('https://www.google.com/maps/embed**',r=>r.fulfill({contentType:'text/html',body:'<html>Embedded map</html>'}));
 await page.goto('/editor/');await add(page,'location');await page.locator('#location-address').fill('Vajdova cesta 23, Semič, Slovenija');await page.locator('#location-address').press('Tab');
 await page.locator('#map-embed').fill('<iframe src="https://www.google.com/maps/embed?pb=test-location" width="600"></iframe>');await page.locator('#map-embed').press('Tab');
 await expect(page.locator('.location iframe')).toHaveAttribute('src','https://www.google.com/maps/embed?pb=test-location');await page.reload();await expect(page.locator('.location iframe')).toHaveCount(1);
 await page.locator('.location').click();await page.locator('#map-mode').selectOption('click');await expect(page.locator('.location iframe')).toHaveCount(0);await page.locator('#preview').click();await page.locator('[data-media="map"]').click();await expect(page.locator('.location iframe')).toHaveCount(1);
 await page.locator('#preview').click();await page.locator('#location-address').fill('Another city');await page.locator('#location-address').press('Tab');await expect(page.locator('#map-embed')).toHaveValue('');await expect(page.locator('.location iframe')).toHaveCount(0);
 await page.locator('#map-embed').fill('https://evil.example/maps/embed?pb=bad');await page.locator('#map-embed').press('Tab');await expect(page.locator('#map-status')).toContainText('Supported: Google Maps');
});
test('quick add recognizes files and video links and rejects invalid uploads',async({page})=>{
 await page.goto('/editor/');await page.locator('[data-tab="blocks"]').click();await page.locator('.quick-content summary').click();await page.locator('#quick-file').setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});await expect(page.locator('#quick-status')).toContainText('does not match');
 await page.locator('#quick-file').setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('My notes')});await expect(page.locator('.document .file-meta')).toContainText('notes.txt');
 await page.locator('[data-tab="blocks"]').click();await page.locator('.quick-content summary').click();await page.locator('#quick-url').fill('https://vimeo.com/123456789/abcdef1234');await page.locator('#quick-add').click();await expect(page.locator('.video [data-media]')).toHaveAttribute('data-src','https://player.vimeo.com/video/123456789?h=abcdef1234');
 await page.locator('[data-tab="blocks"]').click();await page.locator('.quick-content summary').click();await page.locator('#quick-url').fill('https://example.com/price.pdf');await page.locator('#quick-add').click();await expect(page.locator('.document').last().locator('.file-meta')).toContainText('price.pdf');
});

test.describe('touch maps',()=>{
 test.use({isMobile:true,hasTouch:true,viewport:{width:900,height:800}});
 test('coordinates enable the two-finger map and an opaque embed keeps page scrolling available',async({page})=>{
  await page.route('https://tiles.openfreemap.org/styles/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#222b38'}}]})}));
  await page.route('https://www.google.com/maps/embed**',r=>r.fulfill({contentType:'text/html',body:'<html>Embedded map</html>'}));
  await page.goto('/editor/');await add(page,'location');await page.locator('.map-advanced summary').click();await page.locator('#location-latitude').fill('46.0569');await page.locator('#location-latitude').press('Tab');await page.locator('#location-longitude').fill('14.5058');await page.locator('#location-longitude').press('Tab');await page.locator('#preview').click();
  await expect(page.locator('.location .cooperative-map')).toHaveAttribute('data-map-status','ready');expect(await page.locator('.location .cooperative-map').evaluate(el=>getComputedStyle(el,'::after').content)).toContain('two fingers');
  await page.locator('#preview').click();await page.locator('.location').click();await page.locator('#map-embed').fill('<iframe src="https://www.google.com/maps/embed?pb=test-location"></iframe>');await page.locator('#map-embed').press('Tab');await page.locator('#preview').click();
  await expect(page.locator('.location .map-touch-fallback')).toBeVisible();expect(await page.locator('.location iframe').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
 });
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
