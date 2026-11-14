/** Server-side only. Rendering never imports this module or reads its credentials. */
import {readFile,writeFile,rename,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{process.loadEnvFile(path.join(root,'.env.local'));}catch{}
const script=JSON.parse(await readFile(path.join(root,'src/script.json'),'utf8'));
const command=process.argv[2]??'plan',key=process.env.ELEVENLABS_API_KEY;
const chars=script.reduce((n,s)=>n+s.text.length,0);
if(command==='plan'){console.log(JSON.stringify({durationSeconds:58,words:script.reduce((n,s)=>n+s.text.split(/\s+/).length,0),characters:chars,keySaved:!!key,paidCalls:false},null,2));process.exit(0);}
if(!key)throw Error('Save ELEVENLABS_API_KEY in apps/trailer/.env.local first. Do not paste it into chat.');
async function api(endpoint,body){const r=await fetch('https://api.elevenlabs.io'+endpoint,{method:body?'POST':'GET',headers:{'xi-api-key':key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(`ElevenLabs request failed (${r.status}); check permissions and credits in the dashboard. No automatic retries.`);return r;}
if(command==='preflight'){
 const data=await(await api('/v1/user/subscription')).json();
 const voices=await(await api('/v2/voices?page_size=30')).json();
 console.log(JSON.stringify({tier:data.tier,remainingCredits:data.character_limit-data.character_count,scriptCharacters:chars,voices:voices.voices.map(v=>({name:v.name,id:v.voice_id})),paidCalls:false},null,2));
}else if(command==='voice'){
 // This explicit gate is deliberately separate from having a saved key.
 const flag=process.argv.find(s=>s.startsWith('--approved-credit-cap='));
 if(!flag)throw Error('Paid generation is not approved. Agree a credit cap, then pass --approved-credit-cap=N.');
 const cap=Number(flag.split('=')[1]);if(!Number.isSafeInteger(cap)||cap<chars)throw Error('The approved credit cap is too small for one narration pass.');
 const voice=process.env.ELEVENLABS_VOICE_ID;if(!voice)throw Error('Choose a narrator from preflight and save ELEVENLABS_VOICE_ID locally first.');
 const before=await(await api('/v1/user/subscription')).json();if(before.character_limit-before.character_count<chars)throw Error('Insufficient included credits; no overage or top-up will be initiated.');
 for(const scene of script){
  const target=path.join(root,'public/audio',scene.id+'.mp3');try{await access(target);console.log(scene.id+': cached');continue;}catch{}
  const current=await(await api('/v1/user/subscription')).json();if(current.character_count-before.character_count+scene.text.length>cap)throw Error('Approved credit cap reached.');
  const r=await api(`/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,{text:scene.text,model_id:'eleven_multilingual_v2',voice_settings:{stability:.5,similarity_boost:.75,style:.3,speed:1}});
  const temporary=target+'.pending';await writeFile(temporary,Buffer.from(await r.arrayBuffer()));
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',temporary],{encoding:'utf8'}).trim());
  if(!Number.isFinite(duration)||duration>scene.until-scene.at)throw Error(`${scene.id} take is too long (${duration}s). It is saved for review but not enabled. Shorten or re-edit it; do not extend the 58-second composition.`);
  await rename(temporary,target);console.log(scene.id+': saved, '+duration.toFixed(2)+'s');
 }
}else if(command==='music')throw Error('Paid music generation is not approved. The trailer uses the original local score from tools/score.py.');
else throw Error('Use plan, preflight or voice.');
