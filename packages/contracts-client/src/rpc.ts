/** Read-only finalized RPC. Signing stays in a wallet or restricted server transport. */
export class RpcUnavailableError extends Error {}
export class NearRpcViews {
  constructor(readonly url:string,private readonly request:typeof fetch=fetch) {
    const parsed=new URL(url);
    if(parsed.protocol!=="https:" && !(parsed.protocol==="http:" && ["localhost","127.0.0.1","[::1]"].includes(parsed.hostname)))throw new Error("RPC must use HTTPS or local HTTP");
  }
  private async call(method:string,params:Record<string,unknown>):Promise<any> {
    try {
      const response=await this.request(this.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:"rivalghost",method,params}),signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error("RPC HTTP failure");
      const data=await response.json();
      if(data.error || !data.result)throw new Error("RPC query failed");
      return data.result;
    } catch {throw new RpcUnavailableError("NEAR RPC is unavailable; retry without starting another challenge");}
  }
  async transactionResult<T>(hash:string,signerId:string):Promise<T> {
    const result=await this.call("tx",{tx_hash:hash,sender_account_id:signerId,wait_until:"FINAL"});
    if(result.final_execution_status!=="FINAL")throw new RpcUnavailableError("Settlement is still pending finality");
    if(!result.status || !("SuccessValue" in result.status))throw new Error("NEAR transaction failed");
    try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(result.status.SuccessValue),c=>c.charCodeAt(0)))) as T;}
    catch{throw new Error("NEAR transaction returned an invalid result");}
  }
  async assertTestnet():Promise<void> {
    const status=await this.call("status",{});
    if(status.chain_id!=="testnet")throw new Error("Only NEAR testnet is supported");
  }
  async viewWithBlock<T>(contractId:string,method:string,args:Record<string,unknown>,blockHash?:string):Promise<{value:T;blockHash:string}> {
    const bytes=new TextEncoder().encode(JSON.stringify(args));
    const argsBase64=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(""));
    const result=await this.call("query",{request_type:"call_function",...(blockHash?{block_id:blockHash}:{finality:"final"}),account_id:contractId,method_name:method,args_base64:argsBase64});
    if(!Array.isArray(result.result)||result.result.length>1_000_000||!result.result.every((b:unknown)=>Number.isInteger(b)&&Number(b)>=0&&Number(b)<=255)||typeof result.block_hash!=="string")throw new RpcUnavailableError("Invalid NEAR view response");
    try{return {value:JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(result.result))) as T,blockHash:result.block_hash};}
    catch {throw new RpcUnavailableError("Invalid NEAR view JSON");}
  }
  async view<T>(contractId:string,method:string,args:Record<string,unknown>):Promise<T> {return (await this.viewWithBlock<T>(contractId,method,args)).value;}
}
