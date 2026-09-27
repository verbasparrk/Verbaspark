import {test,expect} from '@playwright/test';

test('one main action and section headings survive preview and reload',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'));
 await page.goto('/editor/');
 await expect(page.locator('.card.project')).toBeVisible();
 await page.locator('#featured-card').check();
 await expect(page.locator('.card.project.featured')).toHaveCount(1);
 await page.locator('[data-tab="blocks"]').click();
 await page.locator('[data-add="section"]').click();
 await page.locator('#card-title').fill('My work');
 await page.locator('#card-title').press('Tab');
 await expect(page.locator('.card.section h2')).toHaveText('My work');
 await expect(page.locator('#save-status')).toHaveAttribute('title',/saved on this device/);
 await page.locator('#preview').click();
 await expect(page.locator('.card.section h2')).toHaveText('My work');
 await expect(page.locator('.card.project.featured')).toHaveCount(1);
 await page.reload();
 await expect(page.locator('.card.section h2')).toHaveText('My work');
 await expect(page.locator('.card.project.featured')).toHaveCount(1);
});
