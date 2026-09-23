import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1')));
for(const mobile of [false,true])test(`form placement and direct field editing ${mobile?'mobile':'desktop'}`,async({page})=>{
 if(mobile)await page.setViewportSize({width:390,height:844});
 await page.goto('/editor/');
 const nav=page.locator(mobile?'.mobile-tools':'.primary-navigation');
 await expect(nav.locator('button')).toHaveText(['Content','Design','Settings','Messages','Analytics']);
 await nav.getByRole('button',{name:'Content',exact:true}).click();
 await page.locator('[data-add="contact-form"]').click();
 await page.locator('#save-contact-form').click();
 await page.locator('[data-edit-contact-field="email"]').click();
 await expect(page.locator('[data-field-id="email"] input').first()).toBeFocused();
 await page.locator('[data-field-id="email"] input').first().fill('Your email address');
 await page.locator('#save-contact-form').click();
 await page.locator('#contact-position').selectOption('project');
 await expect(page.locator('.placed-contact-form + .bento .card').first()).toHaveAttribute('data-id','project');
 await page.reload();
 await expect(page.locator('#contact-position')).toHaveValue('project');
 await page.locator('#preview').click();
 await expect(page.locator('.placed-contact-form + .bento .card').first()).toHaveAttribute('data-id','project');
 await expect(page.getByLabel('Your email address')).toBeEditable();
 await expect(page.locator('.form-placement-controls')).toHaveCount(0);
 await page.locator('#preview').click();
 if(!mobile){
  const cardData=await page.evaluateHandle(()=>new DataTransfer());
  await page.locator('.card[data-id="project"]').dispatchEvent('dragstart',{dataTransfer:cardData});
  await page.locator('.card[data-id="intro"]').dispatchEvent('dragover',{dataTransfer:cardData,clientY:0});
  await page.locator('.card[data-id="intro"]').dispatchEvent('drop',{dataTransfer:cardData});
  await expect(page.locator('.card[data-id]').first()).toHaveAttribute('data-id','project');
  const data=await page.evaluateHandle(()=>{const d=new DataTransfer();d.setData('application/x-verbaspark-form','1');return d});
  await page.locator('.card[data-id="intro"]').dispatchEvent('drop',{dataTransfer:data});
  await expect(page.locator('#contact-position')).toHaveValue('intro');
 }
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.evaluate(()=>innerWidth));
 await nav.getByRole('button',{name:'Settings',exact:true}).click();
 await expect(page.locator('.profile-settings')).toBeVisible();
});
