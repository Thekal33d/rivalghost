#!/usr/bin/env python3
"""Read-only media inspection; emits reports/stills into a separate directory."""
import argparse, json, math, subprocess
from pathlib import Path
from fractions import Fraction
p=argparse.ArgumentParser();p.add_argument('video',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--max-seconds',type=float,default=60);p.add_argument('--cuts',default='');p.add_argument('--require-audio',action='store_true');a=p.parse_args()
a.out.mkdir(parents=True,exist_ok=True)
def run(args): return subprocess.run(args,capture_output=True,text=True)
def ff(*args): return run(['ffmpeg','-hide_banner','-nostdin',*map(str,args)])
probe=run(['ffprobe','-v','error','-count_frames','-show_format','-show_streams','-of','json',str(a.video)])
if probe.returncode: raise SystemExit(probe.stderr)
meta=json.loads(probe.stdout);v=next(s for s in meta['streams'] if s['codec_type']=='video');fps=float(Fraction(v['avg_frame_rate']));duration=float(meta['format']['duration'])
report={'file':str(a.video.resolve()),'duration':duration,'within_limit':duration<=a.max_seconds,'fps':fps,'frames':v.get('nb_read_frames'),'width':v['width'],'height':v['height'],'streams':meta['streams'],'human_review_required':True}
decode=ff('-v','error','-i',a.video,'-f','null','-');report['decode_ok']=decode.returncode==0 and not decode.stderr.strip();report['decode_log']=decode.stderr
checks=ff('-i',a.video,'-vf','blackdetect=d=0.03:pix_th=0.02,freezedetect=n=-60dB:d=0.75','-an','-f','null','-');(a.out/'visual-detection.log').write_text(checks.stderr)
report['has_audio']=any(s['codec_type']=='audio' for s in meta['streams'])
if report['has_audio']:
 audio=ff('-i',a.video,'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-');(a.out/'audio-measurement.log').write_text(audio.stderr)
 start=audio.stderr.rfind('{')
 if start>=0:
  try: report['audio']=json.JSONDecoder().raw_decode(audio.stderr[start:])[0]
  except json.JSONDecodeError: report['audio_parse_error']=True
 else: report['audio_parse_error']=True
rows=math.ceil(min(30,math.ceil(duration))/5);interval=duration/(rows*5)
contact=ff('-v','error','-i',a.video,'-vf',f'fps=1/{interval},scale=320:-1,tile=5x{rows}','-frames:v','1','-y',a.out/'contact.jpg')
if contact.returncode: raise SystemExit(contact.stderr)
cutframes=[]
for cut in filter(None,a.cuts.split(',')):
 frame=round(float(cut)*fps)
 for n in [frame-1,frame,frame+1]:
  if not 0<=n<round(duration*fps):continue
  dest=a.out/f'frame-{n:05d}.png';res=ff('-v','error','-ss',f'{n/fps:.9f}','-i',a.video,'-frames:v','1','-y',dest)
  if res.returncode:raise SystemExit(res.stderr)
  cutframes.append(n)
report['cut_frames']=cutframes
(a.out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['duration','within_limit','fps','frames','decode_ok','human_review_required']},indent=2))
raise SystemExit(0 if report['decode_ok'] and report['within_limit'] and not report.get('audio_parse_error') and (not a.require_audio or report['has_audio']) else 1)
