import {type Guest,GuestStore} from "./guest-store.js";
export interface GuestProvisioner {
  accountId(publicKey:string):string;
  ensureAccount(accountId:string,publicKey:string):Promise<void>;
  ensureGrant(accountId:string):Promise<void>;
  reserveYocto:bigint;
}
export class GuestService {
  private pending=new Map<string,Promise<Guest>>();
  private chain:Promise<unknown>=Promise.resolve();
  constructor(readonly store:GuestStore,private readonly provider?:GuestProvisioner,private readonly budget=0n,private readonly maxAttempts=0) {}
  get configured(){return Boolean(this.provider)&&this.budget>0n&&this.maxAttempts>0;}
  provision(guest:Guest):Promise<Guest> {
    if(!this.configured)return Promise.reject(new Error("Online guest accounts are not configured yet"));
    const current=this.store.guest(guest.id)!;
    if(current.state==="ready")return Promise.resolve(current);
    const existing=this.pending.get(guest.id);if(existing)return existing;
    const task=this.chain.then(async()=>{
      const provider=this.provider!,accountId=provider.accountId(guest.publicKey);
      if(current.accountId&&current.accountId!==accountId)throw new Error("Guest account configuration changed; operator review required");
      this.store.reserve(guest.id,provider.reserveYocto,this.budget,this.maxAttempts);
      this.store.setProvisioning(guest.id,accountId,"pending");
      await provider.ensureAccount(accountId,guest.publicKey);
      await provider.ensureGrant(accountId);
      this.store.setProvisioning(guest.id,accountId,"ready");return this.store.guest(guest.id)!;
    });
    this.pending.set(guest.id,task);this.chain=task.catch(()=>{});
    void task.finally(()=>this.pending.delete(guest.id)).catch(()=>{});return task;
  }
}
