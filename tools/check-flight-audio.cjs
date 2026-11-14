const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const base=process.env.CHECK_URL||'http://127.0.0.1:4192';
(async()=>{const b=await chromium.launch({headless:true});try{
 const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await c.addInitScript(()=>{
  if(!localStorage.getItem('rivalghost.player-journey.v1'))localStorage.setItem('rivalghost.player-journey.v1',JSON.stringify({version:1,welcomed:true,tutorial:'complete',legacy:true,tips:false}));
  const Native=window.AudioContext;window.audioStats={oscillators:0,buffers:0,musicStarts:[]};
  window.AudioContext=class extends Native{
   constructor(...args){super(...args);window.audioContext=this;}
   createDynamicsCompressor(){const comp=super.createDynamicsCompressor(),probe=super.createAnalyser(),connect=comp.connect.bind(comp);probe.connect(this.destination);comp.connect=(target)=>{connect(probe);return target;};window.audioProbe=probe;return comp;}
   createOscillator(){window.audioStats.oscillators++;return super.createOscillator();}
   createBufferSource(){window.audioStats.buffers++;const s=super.createBufferSource(),start=s.start.bind(s);s.start=(...args)=>{if(s.buffer?.duration>60)window.audioStats.musicStarts.push(args[1]??0);return start(...args);};return s;}
  };
  window.audioRms=()=>{const a=window.audioProbe;if(!a)return 0;const v=new Float32Array(a.fftSize);a.getFloatTimeDomainData(v);return Math.sqrt(v.reduce((s,n)=>s+n*n,0)/v.length);};
 });
 await c.route('**/api/guest/**',r=>{const path=new URL(r.request().url()).pathname;return r.fulfill({json:path.endsWith('/me')?{guest:null}:path.endsWith('/config')?{enabled:false}:path.endsWith('/workshop')?{districts:Array(10).fill(0),pilot:{equipped:null}}:{} });});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR',e.message);});await p.goto(base);await p.getByRole('button',{name:/Fly chapter 01/}).waitFor();
 const sizes=[[320,568],[390,844],[430,932],[844,390]];
 for(const [width,height]of sizes){await p.setViewportSize({width,height});await p.evaluate(()=>scrollTo(0,0));const box=await p.getByRole('button',{name:/Fly chapter 01/}).boundingBox();assert(box.y>=0&&box.y+box.height<=height,JSON.stringify({width,height,box}));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.setViewportSize({width:390,height:844});
 await p.getByRole('link',{name:'SIGNAL MAP',exact:true}).click();
 await p.setViewportSize({width:320,height:568});const mapBox=await p.locator('.map-launch button').boundingBox();assert(mapBox.y>=0&&mapBox.y+mapBox.height<=568,'Map launch visible');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.getByRole('link',{name:'FLIGHT DECK',exact:true}).click();await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/rivalghost-mobile-fly.png'});
 await p.getByRole('button',{name:/Fly chapter 01/}).click();await p.waitForTimeout(4500);
 console.log(await p.evaluate(()=>({state:window.audioContext?.state,stats:window.audioStats,rms:window.audioRms()})));await p.screenshot({path:'/tmp/rivalghost-mobile-game.png'});assert.equal(await p.evaluate(()=>window.audioContext.state),'running');assert(await p.evaluate(()=>window.audioStats.oscillators)>3);assert(await p.evaluate(()=>window.audioRms())>.001,'Flight should output audio without touching the playfield');
 const sound=p.getByRole('button',{name:'Sound is on, turn off',exact:true});assert(await sound.isVisible());await p.screenshot({path:'/tmp/rivalghost-mobile-game.png'});
 await sound.click();await p.waitForTimeout(400);assert(await p.evaluate(()=>window.audioRms())<.0001,'mute');
 await p.getByRole('button',{name:'Sound is off, turn on',exact:true}).click();await p.waitForTimeout(350);assert(await p.evaluate(()=>window.audioRms())>.001,'unmute');
 await p.getByRole('button',{name:'Pause flight',exact:true}).click();await p.waitForTimeout(350);assert(await p.evaluate(()=>window.audioRms())<.0001,'pause silence');
 await p.locator('.pause-resume').click();await p.waitForTimeout(350);assert(await p.evaluate(()=>window.audioRms())>.001,'resume audio');assert(await p.evaluate(()=>window.audioStats.musicStarts.at(-1))>2,'music must resume at its saved position');
 await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.waitForTimeout(350);assert(await p.evaluate(()=>window.audioRms())<.0001,'blur silence');
 await p.getByRole('button',{name:'Pause menu: turn sound off',exact:true}).click();await p.reload();assert.equal(await p.getByRole('button',{name:'Sound is off, turn on',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({sizes,flyVisibleWithoutScroll:true,audioStartsFromFly:true,mute:true,resume:true,blur:true,muteRemembered:true,errors}));
 await c.close();
 const fallback=await b.newContext({viewport:{width:1440,height:900}});const page=await fallback.newPage();
 await page.route('**/audio/flight-music.mp3',r=>r.abort());
 await page.route('**/api/guest/**',r=>r.fulfill({status:503,json:{error:'Offline test'}}));
 await page.addInitScript(()=>{localStorage.setItem('rivalghost.player-journey.v1',JSON.stringify({version:1,welcomed:true,tutorial:'complete',legacy:true,tips:false}));window.oscillators=0;const C=window.AudioContext;window.AudioContext=class extends C{createOscillator(){window.oscillators++;return super.createOscillator();}};});
 const fallbackErrors=[];page.on('pageerror',e=>fallbackErrors.push(e.message));await page.goto(base);
 assert.equal(await page.locator('.deck-launch').evaluate(el=>getComputedStyle(el).position),'static');
 await page.getByRole('button',{name:/Fly chapter 01/}).click();await page.waitForTimeout(3500);assert(await page.evaluate(()=>window.oscillators)>3,'effects must survive music fetch failure');
 assert.deepEqual(fallbackErrors,[]);await fallback.close();console.log('Desktop and offline music fallback passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
