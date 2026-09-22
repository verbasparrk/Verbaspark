import {test,expect} from '@playwright/test';

test('new visitor creates a personal draft and returns to it without the wizard',async({page})=>{
 await page.goto('/');await expect(page.locator('.welcome-dialog')).toBeVisible();
 await page.locator('[data-purpose="portfolio"]').click();await page.locator('#welcome-next').click();
 await expect(page.locator('[data-welcome-template="professional"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-welcome-template="creator"]').click();await page.locator('#welcome-next').click();
 await page.locator('#welcome-name').fill('Nika Novak');await page.locator('#welcome-bio').fill('Photographer in Ljubljana.');
 await page.locator('[data-welcome-title="0"]').fill('My work');await page.locator('[data-welcome-url="0"]').fill('javascript:alert(1)');await page.locator('#welcome-next').click();await expect(page.locator('#welcome-error')).toContainText('https://');
 await page.locator('[data-welcome-url="0"]').fill('https://nika.example.com');
 await page.locator('#welcome-back').click();await expect(page.locator('[data-welcome-template="creator"]')).toHaveAttribute('aria-pressed','true');await page.locator('#welcome-next').click();await expect(page.locator('#welcome-name')).toHaveValue('Nika Novak');
 await page.locator('#welcome-next').click();await expect(page.locator('.welcome-dialog')).toHaveCount(0);await expect(page.locator('.intro h2')).toHaveText('Nika Novak');await expect(page.locator('.personal-page')).toContainText('My work');await expect(page.locator('.personal-page')).not.toContainText('Alex Rivera');
 await expect(page.locator('#save-status')).toContainText('Saved on device');await page.reload();await expect(page.locator('.intro h2')).toHaveText('Nika Novak');await expect(page.locator('.welcome-dialog')).toHaveCount(0);
});
test('mobile visitor can create a business card with a photo',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('[data-purpose="business"]').click();await page.locator('#welcome-next').click();await page.locator('#welcome-next').click();await page.locator('#welcome-name').fill('Ana');
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4;return canvas.toDataURL().split(',')[1]});
 await page.locator('#welcome-photo').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await expect(page.locator('#welcome-photo-status')).toHaveText('Photo ready.');
 expect(await page.locator('.welcome-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'test-results/welcome-mobile.png'});
 await page.locator('#welcome-next').click();await expect(page.locator('.welcome-dialog')).toHaveCount(0);await expect(page.locator('.personal-page')).toContainText('Ana');await expect(page.locator('.personal-page img').first()).toHaveAttribute('src',/^data:image\/webp/);
});
test('skip persists across reload',async({page})=>{
 await page.goto('/');await page.locator('#welcome-skip').click();await page.reload();await expect(page.locator('.intro h2')).toBeVisible();await expect(page.locator('.welcome-dialog')).toHaveCount(0);
});
test('existing legacy draft bypasses the welcome flow',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('verbaspark-v1',JSON.stringify({name:'Existing owner',accent:'#448aff',gap:16,radius:12,cards:[{id:'intro',type:'intro',size:'wide',title:'Existing owner',body:'Keep my page'}]})));
 await page.goto('/');await expect(page.locator('.intro h2')).toHaveText('Existing owner');await expect(page.locator('.welcome-dialog')).toHaveCount(0);
});
