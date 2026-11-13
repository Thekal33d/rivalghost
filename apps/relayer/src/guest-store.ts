import {DatabaseSync} from "node:sqlite";
import {createHash,randomBytes,createPublicKey,verify} from "node:crypto";
import {guestAuthMessage,type GuestChallenge} from "@rivalghost/game-data";

const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
export interface Guest {id:string;publicKey:string;accountId:string|null;state:"local"|"pending"|"ready"}
export class GuestStore {
  readonly db:DatabaseSync;
  constructor(path:string,readonly origin:string,private readonly now=Date.now) {
    const url=new URL(origin);
    if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname)))throw new Error("Guest authentication requires HTTPS or localhost");
    if(url.origin!==origin)throw new Error("Configure an exact application origin");
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS guests(id TEXT PRIMARY KEY, public_key TEXT UNIQUE NOT NULL, account_id TEXT, state TEXT NOT NULL DEFAULT 'local');
      CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY, public_key TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, guest_id TEXT NOT NULL REFERENCES guests(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rate_windows(id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS bootstrap_budget(day TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reserved TEXT NOT NULL);
    `);
    if(!this.db.prepare("PRAGMA table_info(sessions)").all().some(c=>c.name==="auth_method"))this.db.exec("ALTER TABLE sessions ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'device'");
  }
  close(){this.db.close();}
  private clean(){const now=this.now();for(const table of ["nonces","sessions","rate_windows"])this.db.prepare(`DELETE FROM ${table} WHERE expires <= ?`).run(now);}
  rate(key:string,max:number,windowMs=60000){
    this.clean();const id=hash(key)+":"+Math.floor(this.now()/windowMs);
    this.db.prepare("INSERT INTO rate_windows VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1").run(id,this.now()+windowMs);
    const row=this.db.prepare("SELECT count FROM rate_windows WHERE id=?").get(id)!;
    if(Number(row.count)>max)throw new Error("Too many attempts; try again shortly");
  }
  challenge(publicKey:string,ip:string):GuestChallenge {
    if(!/^[a-f0-9]{64}$/.test(publicKey))throw new Error("Invalid public key");
    this.rate("challenge-global",100);this.rate("challenge-ip:"+ip,6);
    if((!this.db.prepare("SELECT id FROM guests WHERE public_key=?").get(publicKey)&&Number(this.db.prepare("SELECT count(*) AS n FROM guests").get()!.n)>=10000)||Number(this.db.prepare("SELECT count(*) AS n FROM nonces").get()!.n)>=200)throw new Error("Guest registration is at capacity");
    const c={nonce:randomBytes(32).toString("hex"),publicKey,origin:this.origin,expiresAt:this.now()+60000};
    this.db.prepare("INSERT INTO nonces VALUES(?,?,?)").run(c.nonce,publicKey,c.expiresAt);return c;
  }
  authenticate(nonce:string,publicKey:string,signature:string):{token:string;guest:Guest} {
    const row=this.db.prepare("DELETE FROM nonces WHERE nonce=? RETURNING *").get(nonce);
    if(!row||row.public_key!==publicKey||Number(row.expires)<=this.now()||!/^[a-f0-9]{128}$/.test(signature))throw new Error("Guest proof expired or invalid");
    const key=createPublicKey({key:Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),Buffer.from(publicKey,"hex")]),type:"spki",format:"der"});
    if(!verify(null,Buffer.from(guestAuthMessage({nonce,publicKey,origin:this.origin,expiresAt:Number(row.expires)})),key,Buffer.from(signature,"hex")))throw new Error("Guest proof is invalid");
    const id=hash(publicKey),token=randomBytes(32).toString("hex");
    if(this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='near_identities'").get()&&this.db.prepare("SELECT account_id FROM near_identities WHERE guest_id=?").get(id))throw new Error("Use NEAR Auth for this linked pilot");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if(!this.guest(id)&&Number(this.db.prepare("SELECT count(*) AS n FROM guests").get()!.n)>=10000)throw new Error("Guest registration is at capacity");
      this.db.prepare("INSERT OR IGNORE INTO guests(id,public_key) VALUES(?,?)").run(id,publicKey);
      this.db.prepare("DELETE FROM sessions WHERE guest_id=?").run(id);
      this.db.prepare("INSERT INTO sessions(hash,guest_id,expires) VALUES(?,?,?)").run(hash(token),id,this.now()+12*60*60*1000);
      this.db.exec("COMMIT");
    }catch(error){this.db.exec("ROLLBACK");throw error;}
    return {token,guest:this.guest(id)!};
  }
  guest(id:string):Guest|null {
    const row=this.db.prepare("SELECT * FROM guests WHERE id=?").get(id);
    return row?{id:String(row.id),publicKey:String(row.public_key),accountId:row.account_id===null?null:String(row.account_id),state:row.state as Guest["state"]}:null;
  }
  session(token:string):Guest|null {
    if(!/^[a-f0-9]{64}$/.test(token))return null;
    const row=this.db.prepare("SELECT guest_id FROM sessions WHERE hash=? AND expires>?").get(hash(token),this.now());return row?this.guest(String(row.guest_id)):null;
  }
  authMethod(token:string):string|null{return this.session(token)?String(this.db.prepare("SELECT auth_method FROM sessions WHERE hash=?").get(hash(token))!.auth_method):null;}
  logout(token:string){this.db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(token));}
  setProvisioning(id:string,accountId:string,state:"pending"|"ready"){this.db.prepare("UPDATE guests SET account_id=?,state=? WHERE id=?").run(accountId,state,id);}
  reserve(id:string,cost:bigint,dailyBudget:bigint,maxAttempts:number){
    if(cost<=0n||dailyBudget<=0n||!Number.isInteger(maxAttempts)||maxAttempts<1)throw new Error("Bootstrap budget is not configured");
    this.rate("bootstrap-guest:"+id,3,86400000);
    const day=new Date(this.now()).toISOString().slice(0,10);
    this.db.exec("BEGIN IMMEDIATE");
    try{
      const row=this.db.prepare("SELECT * FROM bootstrap_budget WHERE day=?").get(day);
      const attempts=Number(row?.attempts??0),reserved=BigInt(String(row?.reserved??0));
      if(attempts>=maxAttempts||reserved+cost>dailyBudget)throw new Error("Today's guest sponsorship budget is full");
      this.db.prepare("INSERT INTO bootstrap_budget VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET attempts=excluded.attempts,reserved=excluded.reserved").run(day,attempts+1,String(reserved+cost));
      this.db.exec("COMMIT");
    }catch(error){this.db.exec("ROLLBACK");throw error;}
  }
}
