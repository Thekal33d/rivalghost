import {createHash} from 'node:crypto';
import {CHAPTERS,RIGS,dailySignal,validateUsername,validateAvatar,type SocialProfile} from '@rivalghost/game-data';
import {validateExpedition,simulateExpedition,canonicalExpeditionReplayJson,type ExpeditionReplay} from '@rivalghost/sim';
import {GuestStore,type Guest} from './guest-store.js';
export class SocialError extends Error{}
const DAY=86400000;
/** Off-chain, replay-checked scores. Not a NEAR certificate or proof of human play. */
export class SocialService {
  constructor(readonly store:GuestStore,private readonly now=Date.now){store.db.exec(`
    CREATE TABLE IF NOT EXISTS social_profiles(id TEXT PRIMARY KEY REFERENCES guests(id),username TEXT UNIQUE COLLATE NOCASE NOT NULL,avatar TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS social_runs(id TEXT PRIMARY KEY,player TEXT NOT NULL REFERENCES social_profiles(id),mode TEXT NOT NULL,day TEXT NOT NULL,chapter INTEGER NOT NULL,rig TEXT NOT NULL,score INTEGER NOT NULL,replay TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS social_board ON social_runs(mode,day,chapter,rig,score DESC);
    CREATE TABLE IF NOT EXISTS social_rivals(player TEXT NOT NULL REFERENCES social_profiles(id),rival TEXT NOT NULL REFERENCES social_profiles(id),PRIMARY KEY(player,rival));
  `);}
  profile(id:string):SocialProfile|null{const row=this.store.db.prepare('SELECT * FROM social_profiles WHERE id=?').get(id);return row?{id:String(row.id),username:String(row.username),avatar:JSON.parse(String(row.avatar))}:null;}
  saveProfile(guest:Guest,input:{username:unknown;avatar:unknown}){
    this.store.rate('social-profile:'+guest.id,6);
    let username,avatar;try{username=validateUsername(input.username);avatar=validateAvatar(input.avatar);}catch(error){throw new SocialError((error as Error).message);}
    const taken=this.store.db.prepare('SELECT id FROM social_profiles WHERE username=? COLLATE NOCASE').get(username);
    if(taken&&taken.id!==guest.id)throw new SocialError('That username is taken. Try another.');
    this.store.db.prepare('INSERT INTO social_profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,avatar=excluded.avatar').run(guest.id,username,JSON.stringify(avatar));
    return this.profile(guest.id)!;
  }
  private clean(){this.store.db.prepare('DELETE FROM social_runs WHERE created<?').run(this.now()-30*DAY);}
  publish(guest:Guest,input:{replay:ExpeditionReplay;mode:unknown;day?:unknown}){
    if(!this.profile(guest.id))throw new SocialError('Choose a username in Your Pilot before posting a score.');
    this.store.rate('social-publish-global',20);this.store.rate('social-publish:'+guest.id,3);
    const replay=input.replay;
    try{validateExpedition(replay);}catch{throw new SocialError('This replay is invalid. Finish a new flight and try again.');}
    if(replay.rulesVersion!==3)throw new SocialError('This board accepts the current chapter rules only.');
    const today=dailySignal(new Date(this.now())),mode=input.mode,day=mode==='daily'?today.key:'';
    if(mode!=='story'&&mode!=='daily')throw new SocialError('Choose story or daily.');
    if(mode==='story'&&replay.seed!==CHAPTERS[replay.chapter].seed)throw new SocialError('Replay seed does not match this chapter.');
    if(mode==='daily'&&(input.day!==today.key||replay.chapter!==today.chapter||replay.seed!==today.seed))throw new SocialError('That daily signal has ended. Fly today’s signal.');
    // Ignore supplied score/player/name: derive outcome from inputs and authenticated session.
    const result=simulateExpedition(replay),body=canonicalExpeditionReplayJson(replay);
    const id=createHash('sha256').update(guest.id+'|'+mode+'|'+day+'|'+body).digest('hex').slice(0,32);
    this.clean();if(this.store.db.prepare('SELECT id FROM social_runs WHERE id=?').get(id))return this.challenge(id)!;
    const size=this.store.db.prepare('SELECT count(*) AS n,coalesce(sum(length(replay)),0) AS bytes FROM social_runs').get()!;
    if(Number(size.n)>=2000||Number(size.bytes)+Buffer.byteLength(body)>32*1024*1024)throw new SocialError('The board is full for now. Your local flight is still saved.');
    if(Number(this.store.db.prepare('SELECT count(*) AS n FROM social_runs WHERE player=?').get(guest.id)!.n)>=100)throw new SocialError('Your shared flight limit is full for now. Local play is still available.');
    this.store.db.prepare('INSERT INTO social_runs VALUES(?,?,?,?,?,?,?,?,?)').run(id,guest.id,mode,day,replay.chapter,replay.rig,result.score,body,this.now());
    return this.challenge(id)!;
  }
  challenge(id:string){
    if(!/^[a-f0-9]{32}$/.test(id))return null;this.clean();
    const row=this.store.db.prepare('SELECT * FROM social_runs WHERE id=?').get(id);if(!row)return null;
    if(row.mode==='daily'&&row.day!==dailySignal(new Date(this.now())).key)return null;
    return {id:String(row.id),pilot:this.profile(String(row.player))!,mode:row.mode as 'story'|'daily',day:String(row.day),chapter:Number(row.chapter),rig:String(row.rig),score:Number(row.score),replay:JSON.parse(String(row.replay)) as ExpeditionReplay};
  }
  follow(guest:Guest,id:unknown,follow:unknown){
    if(!this.profile(guest.id))throw new SocialError('Save your pilot profile first.');
    if(typeof id!=='string'||id===guest.id||!this.profile(id)||typeof follow!=='boolean')throw new SocialError('Choose another pilot to add as a rival.');
    this.store.rate('social-follow:'+guest.id,15);
    if(follow){if(Number(this.store.db.prepare('SELECT count(*) AS n FROM social_rivals WHERE player=?').get(guest.id)!.n)>=50)throw new SocialError('Your rival list is full (50 pilots).');this.store.db.prepare('INSERT OR IGNORE INTO social_rivals VALUES(?,?)').run(guest.id,id);}
    else this.store.db.prepare('DELETE FROM social_rivals WHERE player=? AND rival=?').run(guest.id,id);
    return {following:follow};
  }
  board(query:URLSearchParams,guest:Guest|null){
    const mode=query.get('mode')??'story',chapter=Number(query.get('chapter')??0),rig=query.get('rig')??'fan',scope=query.get('scope')??'all';
    if(!['story','daily'].includes(mode)||!CHAPTERS.some(c=>c.id===chapter)||!RIGS.some(r=>r.id===rig)||!['all','rivals'].includes(scope))throw new SocialError('Invalid leaderboard filter.');
    this.clean();const day=mode==='daily'?dailySignal(new Date(this.now())).key:'';
    const rows=this.store.db.prepare(`SELECT * FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY player ORDER BY score DESC,created ASC,id ASC) AS best FROM social_runs WHERE mode=? AND day=? AND chapter=? AND rig=?) WHERE best=1 ORDER BY score DESC,created ASC,id ASC`).all(mode,day,chapter,rig);
    const rivals=new Set(guest?this.store.db.prepare('SELECT rival FROM social_rivals WHERE player=?').all(guest.id).map(r=>String(r.rival)):[]);
    const ranked=rows.filter(r=>scope==='all'||r.player===guest?.id||rivals.has(String(r.player))).map((r,index)=>({rank:index+1,id:String(r.id),pilot:this.profile(String(r.player))!,score:Number(r.score),following:rivals.has(String(r.player)),you:r.player===guest?.id}));
    return {rows:ranked.slice(0,20),yourRank:ranked.find(r=>r.you)?.rank??null,total:ranked.length,mode,day,chapter,rig,scope,checked:'replay',retentionDays:30};
  }
}
