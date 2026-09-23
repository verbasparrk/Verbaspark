import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1')));
for(const layout of ['editorial','showcase'])test(`${layout} template, persistence, mobile, export and reversible layout switching`,async({page})=>{
 await page.goto('/');await page.locator('#templates').evaluate(el=>el.click());
 await page.locator(`[data-template="${layout}"]`).click();await page.locator('#keep-content').uncheck();await page.locator('#apply-template').click();
 await expect(page.locator(`.${layout}-page`)).toBeVisible();await expect(page.locator('.card')).toHaveCount(6);
 if(layout==='showcase')await expect(page.locator('.intro .photo-viewport')).toHaveCount(1);
 await page.reload();await expect(page.locator(`.${layout}-page`)).toBeVisible();
 await page.locator('[data-tab=design]').click();await expect(page.locator(`[data-layout-choice="${layout}"]`)).toHaveAttribute('aria-pressed','true');
 await page.locator(`[data-layout-choice="${'bento'}"]`).click();await expect(page.locator('.card')).toHaveCount(6);
 await page.locator(`[data-layout-choice="${layout}"]`).click();await expect(page.locator('.intro h2')).toHaveText('Alex Morgan');
 const download=page.waitForEvent('download');await page.locator('#export').evaluate(el=>el.click());const file=await download;const html=await fs.readFile(await file.path(),'utf8');expect(html).toContain(layout+'-page');expect(html).toContain('Quiet architecture');
 await page.setViewportSize({width:390,height:844});await page.locator('#preview').click();
 await expect(page.locator(`.${layout}-page`)).toBeVisible();expect(await page.evaluate(()=>document.body.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/${layout}-mobile.png`,fullPage:true});
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:`test-results/${layout}-desktop.png`,fullPage:true});
});
