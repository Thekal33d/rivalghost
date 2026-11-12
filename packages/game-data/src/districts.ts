import type {ChapterId} from './expedition.js';
/** Local campaign v3. Presentation and encounter guidance share one authored catalog. */
export const DISTRICTS = [
  {terrain:'relay',name:'RELAY RUSH',twist:'Every fifth patrol kill drops an extra power cell. Rescues recharge Pulse.',cue:'BREAK PATROLS. BUILD YOUR GUN.',route:['Relay outskirts','Live transmission','Switchboard core'],sky:'#15383c',floor:'#285151',accent:'#80b79e'},
  {terrain:'glass',name:'PRISM GATES',twist:'Paired laser gates alternate between the edges and the center. Read gold before it turns red.',cue:'GATES ARMING / FIND THE GAP',route:['Glass approach','Prism corridor','The blockade'],sky:'#26394a',floor:'#405969',accent:'#d2ad7d'},
  {terrain:'engine',name:'ECHO HUNT',twist:'Extra echo interceptors enter on your previous line. Change position after each signal.',cue:'YOUR LAST POSITION IS COMPROMISED',route:['Outer turbines','Ghost archive','Echo chamber'],sky:'#233635',floor:'#3c5146',accent:'#baa86c'},
  {terrain:'water',name:'TIDAL DRIFT',twist:'The current reverses every six seconds. Steer against it while threading the crossfire.',cue:'TIDE REVERSAL / HOLD YOUR LINE',route:['Flood wall','Open tide','Undertow basin'],sky:'#143c4a',floor:'#285d68',accent:'#7fc3bf'},
  {terrain:'rail',name:'FREIGHT CROSSING',twist:'Horizontal freight beams sweep the lower airspace. Move forward or back to clear them.',cue:'FREIGHT INBOUND / CHANGE DEPTH',route:['Freight approach','Switching tracks','Railjack junction'],sky:'#382e29',floor:'#5e4937',accent:'#c9a57c'},
  {terrain:'mirror',name:'DOUBLE EXPOSURE',twist:'Mirrored interceptor pairs join the boss. Break an escort to make room before the sweep.',cue:'TWO CONTACTS / ONE WAY THROUGH',route:['Still water','Reflection array','Twin horizon'],sky:'#293849',floor:'#405a68',accent:'#aebed6'},
  {terrain:'ash',name:'FALLING SKY',twist:'Ash strikes mark your position before impact. Leave the marked circle before it ignites.',cue:'IMPACT MARKED / KEEP MOVING',route:['Burnt outskirts','Ash front','Cinder furnace'],sky:'#362b32',floor:'#5b3a38',accent:'#da8f6f'},
  {terrain:'choir',name:'RESONANCE',twist:'Three grazes trigger Surge. Every Surge instantly recharges Pulse. Turn pressure into a counterattack.',cue:'THREE GRAZES / PULSE RESTORED',route:['Silent approach','Receiver forest','Cantor chamber'],sky:'#233b31',floor:'#3c5540',accent:'#bbce94'},
  {terrain:'crown',name:'CROWN SIEGE',twist:'The outer lanes lock during the boss fight. Watch for crossing freight beams in phase two.',cue:'CROWN LOCKDOWN / WATCH BOTH AXES',route:['High approach','Crown battlements','Regent throne'],sky:'#39382d',floor:'#5c5239',accent:'#ddc17b'},
  {terrain:'dawn',name:'THE LAST FLIGHT',twist:'Tides, freight beams and marked strikes return in sequence. Break Origin to reveal the dawn.',cue:'EVERYTHING YOU LEARNED / ONE FLIGHT',route:['The long night','Memory storm','First light'],sky:'#263747',floor:'#49606a',accent:'#efc598'},
] as const;
export function flightSector(tick:number){return tick<1200?0:tick<2400?1:2;}
export function grazeTarget(chapter:ChapterId,rulesVersion:number){return rulesVersion===3&&chapter===7?3:4;}
