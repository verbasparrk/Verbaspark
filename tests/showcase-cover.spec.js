import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1')));

test('layout previews show current content and Showcase cover survives preview, reload and export',async({page})=>{
 await page.goto('/');
 await page.locator('.card[data-id=intro]').click();
 await page.locator('#card-title').fill('My actual name');await page.locator('#card-title').press('Tab');
 await page.locator('[data-tab=design]').click();
 for(const layout of ['Bento','Classic','Editorial','Showcase']){
  await expect(page.frameLocator(`iframe[title="${layout} preview of your page"]`).locator('.intro h2')).toHaveText('My actual name');
 }
 await page.locator('[data-layout-choice=showcase]').click();
 await expect(page.locator('[data-layout-choice=showcase]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.card')).toHaveCount(9);
 const choice=page.locator('#showcase-cover-source');
 const photo=choice.locator('option[value^="photo:"]').first();
 const photoValue=await photo.getAttribute('value');
 await choice.selectOption(photoValue);
 const photoSrc=await page.locator(`.card[data-id="${photoValue.slice(6)}"] img`).first().getAttribute('src');
 await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',photoSrc);
 for(const [name,value] of [['x','20'],['y','75'],['zoom','130'],['dim','80']])await page.locator(`[data-showcase-cover="${name}"]`).fill(value);
 await expect(page.locator('.showcase-page .intro')).toHaveAttribute('style',/rgba\(0,0,0,0\.8\)/);
 await page.reload();await page.locator('[data-tab=design]').click();
 await expect(page.locator('#showcase-cover-source')).toHaveValue(photoValue);
 await expect(page.locator('[data-showcase-cover=x]')).toHaveValue('20');
 await expect(page.locator('[data-showcase-cover=y]')).toHaveValue('75');
 await expect(page.locator('[data-showcase-cover=zoom]')).toHaveValue('130');
 await expect(page.locator('[data-showcase-cover=dim]')).toHaveValue('80');
 await page.locator('#preview').click();await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',photoSrc);
 await page.locator('#preview').click();
 const download=page.waitForEvent('download');await page.locator('#export').evaluate(el=>el.click());
 const html=await fs.readFile(await (await download).path(),'utf8');
 expect(html).toContain('object-position:20% 75%');expect(html).toContain('rgba(0,0,0,0.8)');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-mobile-tool=design]').click();
 await expect(page.locator('.mobile-sheet .layout-picker-grid button')).toHaveCount(4);
 await expect(page.locator('.mobile-sheet #showcase-cover-source')).toBeVisible();
 expect(await page.evaluate(()=>document.body.scrollWidth<=innerWidth)).toBe(true);
});

test('Showcase accepts an uploaded cover without adding another card',async({page})=>{
 await page.goto('/');await page.locator('[data-tab=design]').click();await page.locator('[data-layout-choice=showcase]').click();
 const before=await page.locator('.card').count();
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;canvas.getContext('2d').fillRect(0,0,8,8);return canvas.toDataURL().split(',')[1]});
 await page.locator('#showcase-cover-upload').setInputFiles({name:'my-cover.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('#showcase-cover-source')).toHaveValue('library');
 await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',/^data:image\/webp;base64,/);
 await expect(page.locator('.card')).toHaveCount(before);
 await page.reload();await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',/^data:image\/webp;base64,/);
});

test('Showcase can use a gallery photo or choose an existing image from the library',async({page})=>{
 await page.goto('/');await page.locator('#templates').evaluate(el=>el.click());
 await page.locator('[data-template=photographer]').click();await page.locator('#keep-content').uncheck();await page.locator('#apply-template').click();
 const cardCount=await page.locator('.card').count();
 await page.locator('[data-tab=design]').click();await page.locator('[data-layout-choice=showcase]').click();
 const option=page.locator('#showcase-cover-source option[value^="gallery:"]').nth(1),value=await option.getAttribute('value');
 await page.locator('#showcase-cover-source').selectOption(value);
 const galleryImage=await page.locator('.card.gallery .gallery-item img').nth(1).getAttribute('src');
 await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',galleryImage);
 await page.locator('#showcase-cover-library').click();
 await expect(page.locator('.file-library-list .library-file')).not.toHaveCount(0);
 await page.locator('.file-library-list .library-file').first().getByRole('button',{name:'Use as Showcase cover'}).click();
 await expect(page.locator('#showcase-cover-source')).toHaveValue('library');
 await expect(page.locator('.card')).toHaveCount(cardCount);
});
