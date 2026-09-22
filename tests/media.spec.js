import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const add=async(page,type)=>{await page.locator('[data-tab="blocks"]').click();await page.locator(`[data-add="${type}"]`).click()};
test('PDF and catalog upload, recovery, preview and standalone download',async({page})=>{
 await page.goto('/');await add(page,'catalog');await page.locator('#file-upload').setInputFiles({name:'menu.pdf',mimeType:'application/pdf',buffer:pdf});
 await expect(page.locator('.catalog .file-meta')).toContainText('menu.pdf');
 await page.locator('#card-image').fill('https://images.unsplash.com/photo-1547592180-85f173990554?w=500');await page.locator('#card-image').press('Tab');await expect(page.locator('.catalog .catalog-cover img')).toHaveCount(1);
 await page.reload();await expect(page.locator('.catalog .file-meta')).toContainText('menu.pdf');await page.locator('#preview').click();
 await page.locator('.catalog [data-media="pdf"]').click();await expect(page.locator('.document-dialog')).toBeVisible();await expect(page.locator('.document-dialog iframe')).toHaveAttribute('src',/^blob:/);await page.keyboard.press('Escape');await expect(page.locator('.document-dialog')).toHaveCount(0);
 await page.locator('#preview').click();await page.locator('[data-tab="design"]').click();await page.locator('#page-layout').selectOption('classic');await expect(page.locator('.classic-page .catalog .file-meta')).toContainText('menu.pdf');
 await page.locator('#page-menu-toggle').click();const exported=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await (await exported).path(),'utf8');expect(html).toContain('data:application/pdf;base64,');
 await page.setContent(html);await page.locator('[data-media="pdf"]').click();await expect(page.locator('.document-dialog')).toBeVisible();await page.keyboard.press('Escape');
 const downloaded=page.waitForEvent('download');await page.locator('.catalog [data-file-download]').click();expect(await fs.readFile(await (await downloaded).path())).toEqual(pdf);
});
test('video and map load only on request; audio remains controllable on phones',async({page})=>{
 await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'<html>Video player</html>',contentType:'text/html'}));await page.route('https://www.openstreetmap.org/**',r=>r.fulfill({body:'<html>Map</html>',contentType:'text/html'}));
 await page.goto('/');await add(page,'video');await page.locator('#card-url').fill('https://youtu.be/dQw4w9WgXcQ');await page.locator('#card-url').press('Tab');
 await add(page,'location');await page.locator('#map-mode').selectOption('click');await page.locator('#location-address').fill('Ljubljana, Slovenia');await page.locator('#location-address').press('Tab');await page.locator('.map-advanced summary').click();await page.locator('#location-latitude').fill('46.0569');await page.locator('#location-latitude').press('Tab');await page.locator('#location-longitude').fill('14.5058');await page.locator('#location-longitude').press('Tab');
 await add(page,'audio');const wav=Buffer.alloc(46);wav.write('RIFF');wav.writeUInt32LE(38,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2,40);
 await page.locator('#file-upload').setInputFiles({name:'hello.wav',mimeType:'audio/wav',buffer:wav});await expect(page.locator('.audio .file-meta')).toContainText('hello.wav');
 await expect(page.locator('.personal-page iframe')).toHaveCount(0);await page.locator('#preview').click();await expect(page.locator('.personal-page iframe')).toHaveCount(0);
 await page.locator('[data-media="video"]').click();await expect(page.locator('.video iframe')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
 await page.locator('[data-media="map"]').click();await expect(page.locator('.location iframe')).toHaveAttribute('src',/marker=46.0569%2C14.5058/);await expect(page.locator('.location a')).toHaveAttribute('href',/destination=46.0569%2C14.5058/);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-media="audio"]').click();await expect(page.locator('audio')).toHaveAttribute('controls','');await expect(page.locator('audio')).toHaveAttribute('preload','none');expect(await page.locator('audio').evaluate(el=>el.autoplay)).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.audio').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/media-mobile.png'});
});
test('shared map embeds display immediately, persist and clear when address changes',async({page})=>{
 await page.route('https://www.google.com/maps/embed**',r=>r.fulfill({contentType:'text/html',body:'<html>Embedded map</html>'}));
 await page.goto('/');await add(page,'location');await page.locator('#location-address').fill('Vajdova cesta 23, Semič, Slovenija');await page.locator('#location-address').press('Tab');
 await page.locator('#map-embed').fill('<iframe src="https://www.google.com/maps/embed?pb=test-location" width="600"></iframe>');await page.locator('#map-embed').press('Tab');
 await expect(page.locator('.location iframe')).toHaveAttribute('src','https://www.google.com/maps/embed?pb=test-location');await page.reload();await expect(page.locator('.location iframe')).toHaveCount(1);
 await page.locator('.location').click();await page.locator('#map-mode').selectOption('click');await expect(page.locator('.location iframe')).toHaveCount(0);await page.locator('#preview').click();await page.locator('[data-media="map"]').click();await expect(page.locator('.location iframe')).toHaveCount(1);
 await page.locator('#preview').click();await page.locator('#location-address').fill('Another city');await page.locator('#location-address').press('Tab');await expect(page.locator('#map-embed')).toHaveValue('');await expect(page.locator('.location iframe')).toHaveCount(0);
 await page.locator('#map-embed').fill('https://evil.example/maps/embed?pb=bad');await page.locator('#map-embed').press('Tab');await expect(page.locator('#map-status')).toContainText('Supported: Google Maps');
});
test('quick add recognizes files and video links and rejects invalid uploads',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="blocks"]').click();await page.locator('.quick-content summary').click();await page.locator('#quick-file').setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});await expect(page.locator('#quick-status')).toContainText('does not match');
 await page.locator('#quick-file').setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('My notes')});await expect(page.locator('.document .file-meta')).toContainText('notes.txt');
 await page.locator('[data-tab="blocks"]').click();await page.locator('.quick-content summary').click();await page.locator('#quick-url').fill('https://vimeo.com/123456789/abcdef1234');await page.locator('#quick-add').click();await expect(page.locator('.video [data-media]')).toHaveAttribute('data-src','https://player.vimeo.com/video/123456789?h=abcdef1234');
 await page.locator('[data-tab="blocks"]').click();await page.locator('.quick-content summary').click();await page.locator('#quick-url').fill('https://example.com/price.pdf');await page.locator('#quick-add').click();await expect(page.locator('.document').last().locator('.file-meta')).toContainText('price.pdf');
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
