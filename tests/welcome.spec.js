import {test,expect} from '@playwright/test';

test('a new visitor creates a private draft in one step without seeing sample content',async({page})=>{
 await page.goto('/editor/');await expect(page.locator('.welcome-dialog')).toBeVisible();
 await expect(page.locator('#app')).toBeHidden();
 await page.locator('#welcome-name').fill('Nika Novak');
 await page.locator('[data-welcome-title="0"]').fill('My work');
 await page.locator('[data-welcome-url="0"]').fill('javascript:alert(1)');
 await page.locator('#welcome-next').click();await expect(page.locator('#welcome-error')).toContainText('https://');
 await page.locator('[data-welcome-url="0"]').fill('https://nika.example.com');
 await page.locator('.welcome-options summary').click();
 await page.locator('[data-purpose="portfolio"]').click();
 await page.locator('#welcome-bio').fill('Photographer in Ljubljana.');
 await page.locator('#welcome-next').click();
 await expect(page.locator('.welcome-dialog')).toHaveCount(0);
 await expect(page.locator('.intro h2')).toHaveText('Nika Novak');
 await expect(page.locator('.personal-page')).toContainText('My work');
 await expect(page.locator('.personal-page')).not.toContainText('Alex Morgan');
 await expect(page.locator('#page-state')).toContainText('Private draft');
 await expect(page.locator('#save-status')).toContainText('Saved on device');
 await page.reload();await expect(page.locator('.intro h2')).toHaveText('Nika Novak');await expect(page.locator('.welcome-dialog')).toHaveCount(0);
});

test('mobile visitor can optionally choose a business card and add a photo',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/editor/');
 await page.locator('#welcome-name').fill('Ana');await page.locator('.welcome-options summary').click();
 await page.locator('[data-purpose="business"]').click();
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4;return canvas.toDataURL().split(',')[1]});
 await page.locator('#welcome-photo').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('#welcome-photo-status')).toHaveText('Photo ready.');
 expect(await page.locator('.welcome-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#welcome-next').click();await expect(page.locator('.welcome-dialog')).toHaveCount(0);
 await expect(page.locator('.personal-page')).toContainText('Ana');
 await expect(page.locator('.personal-page img').first()).toHaveAttribute('src',/^data:image\/webp/);
});

test('exploring the example remains an explicit choice and persists across reload',async({page})=>{
 await page.goto('/editor/');await page.locator('#welcome-skip').click();
 await expect(page.locator('.starter-notice')).toContainText('example page');
 await page.reload();await expect(page.locator('.intro h2')).toBeVisible();await expect(page.locator('.welcome-dialog')).toHaveCount(0);
});

test('an interrupted first visit resumes setup instead of treating the example as a personal draft',async({page})=>{
 await page.goto('/editor/');await expect(page.locator('.welcome-dialog')).toBeVisible();
 await page.reload();await expect(page.locator('.welcome-dialog')).toBeVisible();
 await expect(page.locator('#app')).toBeHidden();
 await page.locator('#welcome-name').fill('Lea');await page.locator('#welcome-next').click();
 await expect(page.locator('.intro h2')).toHaveText('Lea');
});

test('sample editor can be replaced with the one-step setup on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/editor/');await page.locator('#welcome-skip').click();
 await expect(page.locator('#publish-entry')).toBeVisible();await page.locator('#start-my-page').click();
 await page.locator('#welcome-name').fill('Maja Novak');await page.locator('#welcome-next').click();
 await expect(page.locator('.starter-notice')).toHaveCount(0);
 await expect(page.locator('.intro h2')).toHaveText('Maja Novak');
 await page.locator('#publish-entry').click();await expect(page.locator('.publish-review')).toBeVisible();
 await expect(page.locator('.publish-review')).not.toContainText('Alex Morgan example');
 await page.locator('.review-close').click();await page.locator('[data-mobile-tool="dashboard"]').click();
 await expect(page.locator('.page-dashboard')).toContainText('Maja Novak');
 await expect(page.locator('#dashboard-publish')).toBeVisible();
});

test('existing legacy draft bypasses setup',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('verbaspark-v1',JSON.stringify({name:'Existing owner',accent:'#448aff',gap:16,radius:12,cards:[{id:'intro',type:'intro',size:'wide',title:'Existing owner',body:'Keep my page'}]})));
 await page.goto('/editor/');await expect(page.locator('.intro h2')).toHaveText('Existing owner');await expect(page.locator('.welcome-dialog')).toHaveCount(0);
});
