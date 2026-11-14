"""Original 128 BPM score + effects. No samples, network calls or paid services."""
from pathlib import Path
import wave
import numpy as np
SR=48000; LENGTH=58; BEAT=60/128
rng=np.random.default_rng(313)
music=np.zeros((SR*LENGTH,2),dtype=np.float64);sfx=np.zeros_like(music)
def add(bus,x,at,gain=1,pan=0):
 start=round(at*SR)
 if start<0:x=x[-start:];start=0
 n=min(len(x),len(bus)-start)
 if n<=0:return
 x=x[:n]*gain
 bus[start:start+n,0]+=x*np.sqrt((1-pan)/2)
 bus[start:start+n,1]+=x*np.sqrt((1+pan)/2)
def time(d):return np.arange(round(d*SR))/SR
def freq(note):return 440*2**((note-69)/12)
def env(t,attack=.008,decay=.2):return np.minimum(t/attack,1)*np.exp(-t/decay)*np.minimum((t[-1]-t)/.012,1).clip(0,1)
def pluck(note,d=.6):
 t=time(d);f=freq(note);x=sum(np.sin(2*np.pi*f*k*t)*np.exp(-t*(k*.8))/k**1.4 for k in range(1,7));return x*env(t,.003,.18)
def bass(note,d):
 t=time(d);f=freq(note);x=.7*np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*2*f*t)+.12*np.sin(2*np.pi*3*f*t);return np.tanh(x*2)*env(t,.006,d*.8)
def kick():
 t=time(.48);phase=2*np.pi*(46*t+8*(1-np.exp(-t*24)));return np.sin(phase)*np.exp(-t*10)+rng.normal(0,.12,len(t))*np.exp(-t*150)
def snare():
 t=time(.24);n=rng.normal(0,1,len(t));high=n-np.roll(n,1);return (.23*high+.35*np.sin(2*np.pi*185*t))*env(t,.001,.052)
def hat(open=False):
 t=time(.2 if open else .06);n=rng.normal(0,1,len(t));return (n-np.roll(n,1))*.12*env(t,.001,.09 if open else .015)
def hit(d=.9):
 t=time(d);return .6*np.sin(2*np.pi*(35*t+8*(1-np.exp(-t*14))))*np.exp(-t*5)+rng.normal(0,.18,len(t))*np.exp(-t*10)
# Airy intro: a restrained pulse, tape sputter, and the four-note signature.
for i,n in enumerate([64,67,71,66]):add(music,pluck(n,1.2),.35+i*.62,.3,(-1)**i*.35)
for at in [.05,.13,.21,2.7,2.76,2.83]:
 t=time(.055);add(sfx,rng.normal(0,.3,len(t))*env(t,.001,.018),at,.35)
roots=[40,36,43,38];chords=[[52,55,59],[48,52,55],[55,59,62],[50,54,57]]
# Grid starts at the title impact. Layers change at scene boundaries.
for b in range(106):
 at=4.5+b*BEAT
 if at>=53:break
 econ=18<=at<32;hound=32<=at<44.5;proof=at>=44.5
 root=roots[(b//16)%4]
 if b%4==0 or (not hound and b%2==0) or (econ and b%8==7):add(music,kick(),at,.6)
 if b%4==(2 if hound else 1) or (not hound and b%4==3):add(music,snare(),at,.63)
 for half in range(2):add(music,hat(half==1 and b%4==3),at+half*BEAT/2,.55 if half==0 else .32,(-1)**half*.4)
 for sub in range(2):
  note=root+(12 if b%4==3 and sub else 0)
  add(music,bass(note,BEAT*.46),at+sub*BEAT/2,.43 if hound else .3)
 if b%8==0:
  t=time(BEAT*8);pad=np.zeros(len(t))
  for n in chords[(b//16)%4]:
   for det in [-.002,.002]:pad+=np.sin(2*np.pi*freq(n)*(1+det)*t)/6
  gate=np.minimum(t/.5,1)*np.minimum((t[-1]-t)/.8,1).clip(0,1)
  sidechain=.45+.55*np.minimum((t%BEAT)/.13,1)
  add(music,pad*gate*sidechain,at,.24)
 if econ or proof or (7.5<at<18 and b%2==0):
  motif=[76,79,83,78,76,74,71,74];n=motif[b%8]
  x=pluck(n,.6);add(music,x,at,.19 if econ else .25,.15)
  add(music,x,at+BEAT*.75,.075,-.45)
# Designed transitions and gameplay/economy accents.
for at in [4.5,7.5,18,32,44.5]:
 t=time(.7);noise=rng.normal(0,1,len(t));riser=noise*np.linspace(0,.25,len(t))**1.5
 add(sfx,riser,at-.7,.65,-.1);add(sfx,hit(),at,.75)
for at in [9.3,11.3,13.2,15.1]:
 t=time(.3);x=np.sin(2*np.pi*(700*t-700*t*t))*.2*env(t,.002,.07);add(sfx,x,at,.5,.35)
# Salvage click is deliberately distinct from the bright CR coin tick.
for at in [18.5,21,23.6,26.2,29]:
 t=time(.15);add(sfx,rng.normal(0,.15,len(t))*env(t,.001,.025),at,.8,-.2)
for at in [21.6,21.8,26.8,27,34.8,36,39.1,39.3]:
 x=pluck(88,.4)+.3*pluck(95,.4);add(sfx,x,at,.38,.25)
# HOUND gets radio grit, then the final line gets breathing room.
t=time(.15);add(sfx,rng.normal(0,.12,len(t))*env(t,.002,.035),42.1,.5)
cut=int(53*SR);music[cut:]=0
music[cut-int(.12*SR):cut]*=np.linspace(1,0,int(.12*SR))[:,None]
add(sfx,hit(.8),57,.4)
add(sfx,pluck(64,.8),57,.35,-.2);add(sfx,pluck(71,.8),57,.25,.2)
def write(name,bus):
 peak=np.max(np.abs(bus));bus=np.tanh(bus*.85);bus*=.82/max(1,np.max(np.abs(bus)))
 out=Path(__file__).resolve().parents[1]/'public/audio'/name
 with wave.open(str(out),'w') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((bus*32767).astype('<i2').tobytes())
 print(name,'58s',round(peak,3))
write('score.wav',music);write('effects.wav',sfx)
