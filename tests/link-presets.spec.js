import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1')));

test('category browsing and search add a Vimeo video with the selected title',async({page})=>{
 await page.goto('/editor/',{waitUntil:'domcontentloaded'});await page.locator('#add-link').click();
 await expect(page.locator('[data-link-kind="instagram"]')).toBeVisible();
 await expect(page.locator('[data-link-kind="vimeo"]')).toBeHidden();
 await page.locator('[data-link-category="social"]').click();
 await expect(page.locator('[data-link-kind="reddit"]')).toBeVisible();
 await page.locator('#link-search').fill('Vimeo');
 await expect(page.locator('[data-link-kind="vimeo"]')).toBeVisible();
 await page.locator('[data-link-kind="vimeo"]').click();
 await expect(page.locator('[name="title"]')).toHaveValue('Vimeo');
 await expect(page.locator('[name="destination"]')).toHaveAttribute('placeholder',/vimeo\.com/);
 await expect(page.locator('[name="appearance"]')).toBeHidden();
 await page.locator('[name="destination"]').fill('https://vimeo.com/123456789');
 await page.getByRole('button',{name:'Add to my page'}).click();
 await expect(page.locator('.card.selected.video h2')).toHaveText('Vimeo');
 await expect(page.locator('.card.selected.video [data-media]')).toHaveAttribute('data-src','https://player.vimeo.com/video/123456789');
});

test('mobile search adds a direct WhatsApp link without overflowing',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/editor/',{waitUntil:'domcontentloaded'});
 await page.locator('.mobile-menu-toggle').click();
 await page.locator('.mobile-sheet button').filter({hasText:'Add a link'}).click();
 const dialog=page.locator('.link-dialog');
 await dialog.locator('#link-search').fill('WhatsApp');
 await expect(dialog.locator('[data-link-kind]:visible')).toHaveCount(1);
 await dialog.locator('[data-link-kind="whatsapp"]').click();
 await dialog.locator('[name="destination"]').fill('wa.me/38640123456');
 await dialog.locator('[name="appearance"]').selectOption('icon');
 expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await dialog.getByRole('button',{name:'Add to my page'}).click();
 await expect(page.locator('.card.selected.link a')).toHaveAttribute('href','https://wa.me/38640123456');
 await expect(page.locator('.card.selected.link')).toHaveClass(/link-style-icon/);
});
