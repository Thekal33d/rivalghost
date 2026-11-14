import {createRequire} from 'node:module';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const {build}=require(path.join(root,'../../node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'));
const pw=process.env.PLAYWRIGHT_MODULE;
if(!pw)throw Error('Set PLAYWRIGHT_MODULE to the installed Playwright module path.');
const {chromium}=require(pw);
await mkdir(path.join(root,'.capture'),{recursive:true});
await build({entryPoints:[path.join(root,'tools/capture-entry.ts')],bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'.capture/entry.js')});
const html=`<style>@font-face{font-family:'Barlow Condensed';src:url('/font.ttf');font-weight:800}body{margin:0;background:#09171f}canvas{width:1920px;height:1080px}</style><canvas width="1920" height="1080"></canvas><script src="/entry.js"></script>`;
const server=createServer(async(req,res)=>{try{const b=req.url==='/entry.js'?await readFile(path.join(root,'.capture/entry.js')):req.url==='/font.ttf'?await readFile(path.join(root,'public/fonts/BarlowCondensed-BlackItalic.ttf')):html;res.end(b);}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(async()=>{await document.fonts.load('800 20px "Barlow Condensed"');await document.fonts.ready;});
 const shots=[{name:'surge',chapter:2,start:550,frames:180},{name:'rescue',chapter:7,start:1680,frames:120},{name:'boss',chapter:0,start:2610,frames:155},{name:'city',chapter:7,start:950,frames:180,trail:'afterglow',restoration:2}];
 for(const s of shots){
  const draw=(f)=>page.evaluate(({s,f})=>window.drawFrame(s.chapter,s.start+f*2,s.trail,s.restoration),{s,f});
  // Same frame after a backward seek must have exactly the same pixels.
  const a=await draw(40);await draw(100);await draw(0);const b=await draw(40);if(a!==b)throw Error(`Non-deterministic shot ${s.name}`);
  const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','image2pipe','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart','-y',path.join(root,'public/footage',s.name+'.mp4')],{stdio:['pipe','inherit','inherit']});
  let done=once(ff,'close');
  for(let f=0;f<s.frames;f++){const bytes=Buffer.from(await draw(f),'base64');if(!ff.stdin.write(bytes))await once(ff.stdin,'drain');}
  ff.stdin.end();const [code]=await done;if(code)throw Error('FFmpeg capture failed');console.log(s.name,s.frames,'frames, deterministic seek check passed');
 }
 await writeFile(path.join(root,'public/footage/capture-manifest.json'),JSON.stringify({source:'Actual game renderer and simulation; NPC ace controller',rig:'fan',rulesVersion:3,fps:30,dimensions:[1920,1080],framing:'75% centered combat field to keep native labels safe; original environment fills frame',shots},null,2));
}finally{await browser.close();server.close();}
