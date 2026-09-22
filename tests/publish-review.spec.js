import {test,expect} from '@playwright/test';
test('review lists missing content, opens the exact block and refreshes after a fix',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="blocks"]').click();await page.locator('[data-add="document"]').click();await page.locator('#publish-entry').click();
 await expect(page.getByRole('dialog',{name:'Review before publishing'})).toBeVisible();await expect(page.locator('#review-continue')).toBeDisabled();
 await page.getByRole('button',{name:/Upload a file or add a direct file link/}).click();await expect(page.locator('#file-upload')).toBeFocused();
 await page.locator('#file-upload').setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('Useful notes')});await expect(page.locator('.document .file-meta')).toContainText('notes.txt');
 await page.locator('#publish-entry').click();await expect(page.locator('#review-continue')).toBeEnabled();await expect(page.locator('.review-item.error')).toHaveCount(0);await page.locator('#review-continue').click();await expect(page.locator('.account-dialog')).toContainText('Supabase connection');
});
test('mobile review can open settings and ignores unfinished hidden blocks',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('[data-mobile-tool="blocks"]').click();await page.locator('[data-add="gallery"]').click();await page.locator('.sheet-done').click();
 await page.locator('.mobile-menu-toggle').click();await page.getByRole('button',{name:'Review before publishing',exact:true}).click();await page.getByRole('button',{name:/Add photos or hide this empty gallery/}).click();
 await expect(page.locator('.mobile-sheet')).toBeVisible();await expect(page.locator('#gallery-upload')).toBeFocused();await page.locator('#block-hidden').check();await page.locator('.sheet-done').click();
 await page.locator('.mobile-menu-toggle').click();await page.getByRole('button',{name:'Review before publishing',exact:true}).click();await expect(page.locator('#review-continue')).toBeEnabled();await expect(page.locator('.publish-review')).toContainText('1 hidden blocks excluded');await page.screenshot({path:'test-results/publish-review-mobile.png'});
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
