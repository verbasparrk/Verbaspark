import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

async function useClassic(page,keep=false){
 await page.locator('#page-menu-toggle').click();await page.locator('#templates').click();
 await page.locator('[data-template="business-card"]').click();
 await expect(page.frameLocator('iframe[title="Template preview"]').locator('.classic-page .intro h2')).toHaveText('Luka Novak');
 if(!keep)await page.locator('#keep-content').uncheck();await page.locator('#apply-template').click();
}
test('classic template edits, persists and exports its profile header on desktop and mobile',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await useClassic(page);
 await expect(page.locator('.classic-page')).toBeVisible();
 await page.locator('#card-subtitle').fill('Private chef · Maribor');await page.locator('#card-subtitle').press('Tab');
 await page.locator('#card-cta').fill('Book a dinner');await page.locator('#card-cta').press('Tab');
 await expect(page.locator('.intro .card-link')).toContainText('Book a dinner');
 await page.locator('.photo-role-portrait').click();await expect(page.locator('#photo-upload')).toBeVisible();
 await page.locator('#photo-alt').fill('My portrait');await page.locator('#photo-alt').press('Tab');
 await page.reload();await expect(page.locator('.profile-subtitle')).toHaveText('Private chef · Maribor');
 await expect(page.locator('.photo-role-portrait img')).toHaveAttribute('alt','My portrait');
 await page.screenshot({path:'test-results/classic-desktop.png'});
 await page.locator('#page-menu-toggle').click();const download=page.waitForEvent('download');await page.locator('#export').click();
 const html=await fs.readFile(await (await download).path(),'utf8');expect(html).toContain('classic-page');expect(html).toContain('Book a dinner');
 await page.setContent(html);await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.intro .card-link')).toHaveAttribute('href','mailto:luka@example.com');
 await expect(page.locator('.card[draggable]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const portrait=await page.locator('.photo-role-portrait').boundingBox();expect(portrait.width).toBe(100);
 await page.screenshot({path:'test-results/classic-mobile.png',fullPage:true});
});
test('classic can keep existing content, switch back to bento and undo',async({page})=>{
 await page.goto('/');const original=await page.locator('.card h2').allTextContents();await useClassic(page,true);
 expect((await page.locator('.card h2').allTextContents()).sort()).toEqual([...original].sort());
 await page.locator('[data-tab="design"]').click();await page.locator(`[data-layout-choice="${'bento'}"]`).click();
 await expect(page.locator('.classic-page')).toHaveCount(0);await expect(page.locator('.bento[data-measured]')).toBeVisible();
 await page.locator('#undo').click();await expect(page.locator('.classic-page')).toBeVisible();
 await page.reload();await expect(page.locator('.classic-page')).toBeVisible();
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
