import {mkdir,readFile,writeFile,stat,readdir,unlink,link} from "node:fs/promises";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {canonicalReplayJson,canonicalExpeditionReplayJson,sha256Hex,type ReplayInput,type ExpeditionReplay} from "@rivalghost/sim";
import type {ReplayStore} from "./service.js";

export class ReplayStorageError extends Error {}
/** A single-process bounded store. Use a dedicated volume; refuse writes when full. */
export class FileReplayStore implements ReplayStore {
  private queue:Promise<void>=Promise.resolve();
  constructor(readonly directory:string,private readonly maxBytes=64*1024*1024) {}
  private path(hash:string) {if(!/^[a-f0-9]{64}$/.test(hash))throw new Error("Invalid replay hash");return join(this.directory,`${hash}.json`);}
  async get(hash:string):Promise<string|null> {
    try{return await readFile(this.path(hash),"utf8");}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
  }
  async put(hash:string,replay:ReplayInput|ExpeditionReplay):Promise<void> {
    const body=replay.rulesVersion===2?canonicalExpeditionReplayJson(replay as ExpeditionReplay):canonicalReplayJson(replay as ReplayInput);
    if(await sha256Hex(new TextEncoder().encode(body))!==hash)throw new Error("Replay storage hash mismatch");
    const action=this.queue.then(async()=>{
      const path=this.path(hash);
      await mkdir(this.directory,{recursive:true,mode:0o700});
      const existing=await this.get(hash);
      if(existing!==null){if(existing!==body)throw new Error("Stored replay content mismatch");return;}
      const files=await readdir(this.directory);
      if(files.length>=4096)throw new Error("Replay file quota reached");
      let used=0;for(const file of files)used+=(await stat(join(this.directory,file))).size;
      if(used+Buffer.byteLength(body)>this.maxBytes)throw new Error("Replay storage is full");
      const temporary=join(this.directory,`.pending-${randomUUID()}`);
      try {
        await writeFile(temporary,body,{flag:"wx",mode:0o600});
        // Hard-link publishes complete bytes atomically and refuses overwrites.
        await link(temporary,path);
      } finally {await unlink(temporary).catch(()=>{});}
    });
    this.queue=action.catch(()=>{});
    try{await action;}catch{throw new ReplayStorageError("Replay could not be stored; no certificate was issued");}
  }
}
