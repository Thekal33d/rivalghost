import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=fileURLToPath(new URL('../public/audio/',import.meta.url));
const url='https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exit%20the%20Premises.mp3';
const sha='441d1b594a15b0acdac531495e9c56906e3df5d4002fc651b5a0b763f679c70b';
await mkdir(dir,{recursive:true});
let bytes;try{bytes=await readFile(dir+'exit-the-premises.mp3');}catch{const response=await fetch(url);if(!response.ok)throw Error(`Music download failed: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
if(createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('Source track changed. Recheck its provenance before using it.');
await writeFile(dir+'exit-the-premises.mp3',bytes);
// 128 BPM; measured onset phase ~30 ms. Keep the composed track intact.
// Only a fixed -4 dB gain and end fades; do not crush it through another master limiter.
const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-ss','0.033333333','-i',dir+'exit-the-premises.mp3','-t','58','-af','volume=-4dB,afade=t=in:d=0.018,afade=t=out:st=54.25:d=3.75','-ar','48000','-ac','2','-y',dir+'recut-music.wav'],{stdio:'inherit'});
if(result.status!==0)throw Error('FFmpeg music preparation failed');
console.log('Prepared licensed music excerpt. Credit is embedded in the end card; see MUSIC-CREDITS.md. No paid API calls.');
