import {test,expect} from '@playwright/test';

const user={id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',email:'admin@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
const account={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email:'alice@example.com',created_at:'2026-09-01T00:00:00Z',page_name:'Alice',slug:'alice',published_at:'2026-09-02T00:00:00Z',moderated_at:null,restriction_reason:null,matching_count:1};

async function signIn(page){
 const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'mock-signature'].join('.');
 await page.addInitScript(({user,token})=>localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user,token});
 await page.route('http://127.0.0.1:59999/auth/v1/user',route=>route.fulfill({json:user}));
}

test('administrator can search, restrict, restore and inspect the audit log',async({page})=>{
 await signIn(page);
 let restricted=false;const actions=[],queries=[];
 await page.route('**/api/admin?**',route=>{
  expect(route.request().headers().authorization).toMatch(/^Bearer /);
  const params=new URL(route.request().url()).searchParams;queries.push(params.get('q'));
  const row={...account,moderated_at:restricted?'2026-09-24T00:00:00Z':null,restriction_reason:restricted?'Unsafe public content':null};
  return route.fulfill({json:{rows:[row],summary:{accounts:2,live:restricted?0:1,hidden:restricted?1:0,views30d:7,clicks30d:3},audit:actions.map((action,index)=>({id:index+1,target_email:account.email,slug:'alice',action:action.action,reason:action.reason,created_at:'2026-09-24T00:00:00Z'})),page:1}});
 });
 await page.route('**/api/admin',route=>{const input=route.request().postDataJSON();actions.push(input);restricted=input.action==='hide';return route.fulfill({json:{ok:true}})});
 await page.goto('/admin/');
 await expect(page.getByRole('heading',{name:'Admin dashboard'})).toBeVisible();
 await expect(page.locator('#admin-rows')).toContainText('alice@example.com');
 await expect(page.locator('#admin-metrics')).toContainText('7');
 await page.locator('#admin-search').fill('alice');
 await expect.poll(()=>queries.at(-1)).toBe('alice');
 await page.locator('#admin-rows button').click();
 await expect(page.locator('.admin-dialog')).toContainText('The public page will disappear');
 await page.locator('.admin-dialog textarea').fill('Unsafe public content');
 await page.locator('.admin-dialog [type=submit]').click();
 await expect(page.locator('#admin-rows .admin-state')).toHaveText('Restricted');
 expect(actions[0]).toMatchObject({action:'hide',ownerId:account.id,reason:'Unsafe public content'});
 await expect(page.locator('#admin-audit')).toContainText('Unsafe public content');
 await page.locator('#admin-rows button').click();
 await page.locator('.admin-dialog textarea').fill('Review complete');
 await page.locator('.admin-dialog [type=submit]').click();
 await expect(page.locator('#admin-rows .admin-state')).toHaveText('Published');
 expect(actions[1].action).toBe('restore');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('non-administrator sees an access denied page',async({page})=>{
 await signIn(page);
 await page.route('**/api/admin?**',route=>route.fulfill({status:403,json:{error:'Administrator access required.'}}));
 await page.goto('/admin/');
 await expect(page.getByRole('heading',{name:'Admin access required'})).toBeVisible();
 await expect(page.locator('#admin-rows')).toHaveCount(0);
});
