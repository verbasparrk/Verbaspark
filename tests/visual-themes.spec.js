import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1')));
test('visual themes preserve content and layout, persist customization and export',async({page})=>{
 await page.goto('/');const original=await page.locator('.card').evaluateAll(cards=>cards.map(c=>[c.dataset.id,c.querySelector('h2').textContent]));
 await page.locator('[data-tab=design]').click();
 for(const layout of ['bento','classic','editorial','showcase']){
  await page.locator(`[data-layout-choice="${layout}"]`).click();
  for(const theme of ['clean','neobrutalism','cyberpunk','organic']){
   await page.locator(`[data-visual-theme="${theme}"]`).click();
   await expect(page.locator(`[data-layout-choice="${layout}"]`)).toHaveAttribute('aria-pressed','true');
   await expect(page.locator('.personal-page')).toHaveAttribute('data-visual-theme-name',theme);
   const cards=await page.locator('.card').evaluateAll(cards=>cards.map(c=>[c.dataset.id,c.querySelector('h2').textContent]));expect(cards.slice().sort()).toEqual(original.slice().sort());
  }
 }
 await page.locator('[data-visual-theme=neobrutalism]').click();await page.reload();await page.locator('[data-tab=design]').click();
 await expect(page.locator('[data-visual-theme=neobrutalism]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator(`[data-layout-choice="${'showcase'}"]`)).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-hex-key=accent]').fill('#aabbcc');await page.locator('[data-hex-key=accent]').press('Tab');
 await page.reload();await page.locator('[data-tab=design]').click();await expect(page.locator('[data-hex-key=accent]')).toHaveValue('#aabbcc');
 const download=page.waitForEvent('download');await page.locator('#export').evaluate(el=>el.click());const file=await download;const html=await fs.readFile(await file.path(),'utf8');expect(html).toContain('data-visual-theme-name="neobrutalism"');expect(html).toContain('--accent:#aabbcc');expect(html).toContain('6px 6px 0 var(--page-border)');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-mobile-tool=design]').click();
 await expect(page.locator('[data-visual-theme=organic]')).toBeVisible();await page.locator('[data-visual-theme=organic]').click();await page.locator('.sheet-done').click();
 await expect(page.locator('.personal-page')).toHaveAttribute('data-visual-theme-name','organic');expect(await page.evaluate(()=>document.body.scrollWidth<=innerWidth)).toBe(true);
});
