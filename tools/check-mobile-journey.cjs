// Isolated browser fixture: no account creation, paid inference, or on-chain writes.
// PLAYWRIGHT_MODULE=/path/to/playwright CHECK_URL=http://127.0.0.1:4192 node tools/check-mobile-journey.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.CHECK_URL||'http://127.0.0.1:4192';
async function visibleInViewport(page,locator){const box=await locator.boundingBox(),height=page.viewportSize().height;assert(box&&box.y>=0&&box.y+box.height<=height,JSON.stringify({box,height}));}
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const guided of [true,false]){
  const ctx=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
  if(!guided)await ctx.addInitScript(()=>localStorage.setItem('rivalghost.player-journey.v1',JSON.stringify({version:1,welcomed:true,tutorial:'skipped',legacy:false,tours:[],tips:true})));
  await ctx.route('**/api/guest/**',r=>r.fulfill({json:r.request().url().endsWith('/me')?{guest:null}:r.request().url().endsWith('/workshop')?{districts:Array(10).fill(0),pilot:null}:{enabled:false}}));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  if(guided){await page.getByRole('button',{name:'SHOW ME THE CONTROLS',exact:true}).click();await page.getByRole('button',{name:'START GUIDED FLIGHT',exact:true}).click();}
  else {const tips=page.getByRole('button',{name:'TURN OFF TIPS',exact:true});if(await tips.isVisible())await page.getByRole('button',{name:'Close walkthrough',exact:true}).click();await page.getByRole('button',{name:/Fly chapter 01/}).click();}
  await page.clock.install();await page.clock.fastForward(65000);await page.locator('.screen-result').waitFor();
  assert.match(await page.locator('.result-detail h1').innerText(),/RECLAIMED/,'The first boss must actually be defeated');
  await visibleInViewport(page,page.locator('.walkthrough-card'));await page.getByRole('button',{name:'TURN OFF TIPS',exact:true}).click();
  const close=page.getByRole('button',{name:'Close',exact:true});if(await close.isVisible())await close.click();
  for(const [width,height]of [[320,568],[390,844],[430,932]]){
   await page.setViewportSize({width,height});
   await visibleInViewport(page,page.locator('.result-primary-actions .primary-button'));
   await visibleInViewport(page,page.locator('.result-primary-actions .next-chapter'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.getByRole('button',{name:'STORY TRANSMISSION',exact:true}).click();
  await visibleInViewport(page,page.getByRole('button',{name:'Close dialog',exact:true}));
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.locator('.result-primary-actions .next-chapter').click();assert.equal(await page.locator('.screen-lobby').count(),1);
  assert.deepEqual(errors,[]);console.log(`${guided?'Guided':'Normal'} first-boss clear: result, tips, actions and story sheet passed`);await ctx.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
