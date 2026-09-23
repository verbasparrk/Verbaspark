import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('grouped library chooses useful defaults and works on phones',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="blocks"]').click();await expect(page.getByRole('dialog',{name:'Add content',exact:true})).toBeVisible();await expect(page.locator('.content-group')).toHaveCount(5);await expect(page.locator('.choice-example')).toHaveCount(13);
 await page.screenshot({path:'test-results/content-library-desktop.png'});await page.locator('[data-add="audio"]').click();await expect(page.locator('.card.audio')).toHaveClass(/wide/);await expect(page.locator('.content-dialog')).toHaveCount(0);
 await page.locator('[data-tab="blocks"]').click();await page.locator('[data-add="contact"]').click();await expect(page.locator('#card-url')).toHaveValue('mailto:');await expect(page.locator('#compact-card')).toBeChecked();
 await page.setViewportSize({width:390,height:844});await page.locator('[data-mobile-tool="blocks"]').click();await expect(page.locator('.mobile-sheet #content-library')).toBeVisible();await page.screenshot({path:'test-results/content-library-mobile.png'});await page.locator('[data-add="catalog"]').click();await expect(page.locator('#card-title')).toHaveValue('My catalog');await expect(page.locator('#file-upload')).toBeVisible();
});
test('duplicate is independent; hidden blocks stay in draft and out of preview and export',async({page})=>{
 await page.goto('/');await page.locator('#duplicate-block').click();await expect(page.locator('#card-title')).toHaveValue('Interface systems (copy)');await expect(page.locator('.card.project')).toHaveCount(2);
 await page.locator('#card-title').fill('Private future project');await page.locator('#card-title').press('Tab');await expect(page.locator('[data-id="project"] h2')).toHaveText('Interface systems');
 await page.locator('#block-hidden').check();await expect(page.locator('.block-hidden h2')).toHaveText('Private future project');await page.locator('#preview').click();await expect(page.locator('.card.project')).toHaveCount(1);await expect(page.locator('.personal-page')).not.toContainText('Private future project');
 await page.locator('#page-menu-toggle').click();const download=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await(await download).path(),'utf8');expect(html).not.toContain('Private future project');
 await page.reload();await expect(page.locator('.block-hidden h2')).toHaveText('Private future project');await page.locator('.block-hidden').click();await expect(page.locator('#block-hidden')).toBeChecked();await page.locator('#block-hidden').uncheck();await expect(page.locator('.block-hidden')).toHaveCount(0);await page.locator('#undo').click();await expect(page.locator('.block-hidden')).toHaveCount(1);
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
