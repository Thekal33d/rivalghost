// Isolated API fixtures; real browser encryption, downloads, IndexedDB and signature checks. No live account writes.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const password='Browser-test-only password 123!',url=process.env.CHECK_URL||'http://127.0.0.1:4192';
(async()=>{
 const {embeddedLoginMessage}=await import('../packages/game-data/dist/index.js');
 const backups=[];
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   async function setup(){
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
    await context.addInitScript(()=>localStorage.setItem('rivalghost.player-journey.v1',JSON.stringify({version:1,welcomed:true,tutorial:'complete',legacy:true,tips:false})));
    let challenge=null,session={guest:null},signed=0;
    await context.route('**/api/guest/**',async r=>{
     const path=new URL(r.request().url()).pathname;let json={enabled:false};
     if(path.endsWith('/embedded/config'))json={enabled:true};
     if(path.endsWith('/me'))json=session;
     if(path.endsWith('/embedded/begin')){const body=r.request().postDataJSON();challenge={accountId:body.accountId,origin:new URL(url).origin,nonce:'ab'.repeat(32),expiresAt:Date.now()+60000};json=challenge;}
     if(path.endsWith('/embedded/complete')){
      const body=r.request().postDataJSON(),pub=await webcrypto.subtle.importKey('raw',Buffer.from(challenge.accountId,'hex'),'Ed25519',false,['verify']);
      assert(await webcrypto.subtle.verify('Ed25519',pub,Buffer.from(body.signature,'hex'),new TextEncoder().encode(embeddedLoginMessage(challenge))));signed++;
      json=session={authMethod:'embedded',onlineAvailable:true,guest:{id:challenge.accountId,publicKey:challenge.accountId,accountId:challenge.accountId,state:'ready'}};
     }
     await r.fulfill({json});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.getByRole('button',{name:'PLAY FIRST',exact:true}).click();await page.locator('.pilot-chip').click();
    return {context,page,errors,signed:()=>signed};
   }
   async function settle(page){await page.waitForTimeout(1000);const got=page.getByRole('button',{name:'GOT IT',exact:true});if(await got.isVisible())await got.click();}
   async function upload(page,buffer){await page.locator('.device-restore-options summary').click();await page.locator('input[type=file]').setInputFiles({name:'rivalghost-testnet-review.json',mimeType:'application/json',buffer});await settle(page);}
   const x=await setup(),p=x.page;
   await p.getByLabel('Recovery password',{exact:true}).fill(password);await p.getByLabel('Confirm recovery password',{exact:true}).fill(password);await p.getByRole('button',{name:'CREATE ACCOUNT',exact:true}).click();
   await p.getByRole('button',{name:'DOWNLOAD RECOVERY FILE',exact:true}).waitFor();await settle(p);
   assert.equal(await p.locator('input[type=file]').isVisible(),false,'Restore should not interrupt new signup');
   const event=p.waitForEvent('download');await p.getByRole('button',{name:'DOWNLOAD RECOVERY FILE',exact:true}).click();const download=await event,buffer=fs.readFileSync(await download.path());assert.equal(buffer.length,445);backups.push(buffer);
   await upload(p,Buffer.from('{}'));await p.getByText(/This is not a RivalGhost recovery file/).first().waitFor();await settle(p);
   assert(await p.getByText('ACCOUNT SAVED ON THIS DEVICE',{exact:false}).isVisible(),'Invalid file preserves saved account');
   await p.getByLabel('I saved my recovery file and password.',{exact:false}).check();
   const sign=p.getByRole('button',{name:'SIGN IN',exact:true});const box=await sign.boundingBox();assert(box.y>=0&&box.y+box.height<=844,'Primary action stays visible');
   await sign.click();await p.getByText('You’re signed in. Enable game purchases below when you’re ready.',{exact:true}).waitFor();assert.equal(x.signed(),1);assert.deepEqual(x.errors,[]);
   await x.context.close();
   // Fresh browser contexts exercise actual restore, including a backup created by the other engine.
   for(const backup of backups){
    const y=await setup();await upload(y.page,backup);await y.page.getByRole('button',{name:'RESTORE ACCOUNT',exact:true}).waitFor();
    await y.page.getByLabel('Backup password',{exact:true}).fill('incorrect');await y.page.getByRole('button',{name:'RESTORE ACCOUNT',exact:true}).click();await y.page.getByText('Wrong password or damaged recovery file.',{exact:true}).first().waitFor();await settle(y.page);
    await y.page.getByLabel('Backup password',{exact:true}).fill(password);await y.page.getByRole('button',{name:'RESTORE ACCOUNT',exact:true}).click();await y.page.getByText('Recovery file verified. Sign in below.',{exact:true}).waitFor();await settle(y.page);
    await y.page.getByRole('button',{name:'SIGN IN',exact:true}).click();await y.page.getByText('You’re signed in. Enable game purchases below when you’re ready.',{exact:true}).waitFor();assert.equal(y.signed(),1);assert.deepEqual(y.errors,[]);
    assert(await y.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await y.context.close();
   }
   console.log(name+': saved-device sign-in after rejected file, 445-byte download, fresh-context restore, wrong-password retry, verified signatures and mobile layout passed');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
