import {test,expect} from '@playwright/test';

test('landing page explains the product and leads to the editor and three examples',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('More you.');
 await expect(page.getByRole('link',{name:/Create your page/})).toHaveAttribute('href','/editor/');
 for(const slug of ['photographer','developer','personal']){
  const link=page.locator(`a[href="/examples/${slug}/"]`);await expect(link).toBeVisible();
  await link.click();await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');await page.goBack();
 }
 await page.getByRole('link',{name:/Create your page/}).click();
 await expect(page).toHaveURL(/\/editor\/$/);await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');
});

test('landing page fits a phone without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('link',{name:/Create your page/})).toBeVisible();
});
