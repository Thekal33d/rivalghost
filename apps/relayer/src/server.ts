import {mkdir,readFile,chmod} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import type {KeyPairString} from "near-api-js";
import {GuestStore} from "./guest-store.js";
import {GuestService} from "./guest-service.js";
import {NearGuestProvisioner} from "./near-bootstrap.js";
import {createGuestServer,type VerificationGateway} from "./guest-http.js";
async function main(){
  const origin=process.env.APP_ORIGIN??"http://localhost:5173",file=resolve(process.env.GUEST_DATABASE??".local/guests.sqlite");
  await mkdir(dirname(file),{recursive:true,mode:0o700});
  const store=new GuestStore(file,origin);await chmod(file,0o600);
  let provider:NearGuestProvisioner|undefined,gateway:VerificationGateway|undefined;
  let budget=0n,maxAttempts=0;
  if(process.env.BOOTSTRAP_ENABLED==="true"){
    if(process.env.NEAR_NETWORK!=="testnet")throw new Error("Set NEAR_NETWORK=testnet");
    const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Missing ${name}`);return value;};
    let privateKey:KeyPairString;
    try {privateKey=(await readFile(required("OPERATOR_KEY_FILE"),"utf8")).trim() as KeyPairString;}catch{throw new Error("Cannot read operator key file");}
    provider=new NearGuestProvisioner({parentId:required("GUEST_PARENT_ID"),contractId:required("CONTRACT_ID"),rpcUrl:process.env.NEAR_RPC_URL??"https://rpc.testnet.near.org",privateKey,fundingYocto:BigInt(required("GUEST_FUNDING_YOCTO")),gasPriceCap:BigInt(required("GAS_PRICE_CAP_YOCTO"))});
    budget=BigInt(required("BOOTSTRAP_DAILY_BUDGET_YOCTO"));maxAttempts=Number(required("BOOTSTRAP_DAILY_ATTEMPTS"));
    if(budget<provider.reserveYocto||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>100)throw new Error("Invalid guest sponsorship budget");
    await provider.checkConfiguration();
    const endpoint=new URL(required("VERIFIER_URL"));if(endpoint.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(endpoint.hostname))throw new Error("Verifier must use HTTPS");
    const verifierToken=required("VERIFIER_SERVICE_TOKEN");
    gateway={async verify(guest,submission){
      const response=await fetch(new URL("/verify",endpoint),{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${verifierToken}`},body:JSON.stringify({...submission,playerId:guest.accountId}),signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error("Verifier rejected request");
      const result=await response.json();
      if(result.status!=="verified"||result.settled!==false||result.certificate?.playerId!==guest.accountId||result.certificate?.challengeId!==submission.challengeId)throw new Error("Invalid verifier response");
      return result;
    }};
  }
  const service=new GuestService(store,provider,budget,maxAttempts),port=Number(process.env.PORT??8788);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error("Invalid guest server port");
  const server=createGuestServer(service,gateway);
  server.listen(port,"127.0.0.1",()=>console.log(`RivalGhost guest gateway: 127.0.0.1:${port}; ${service.configured?"testnet provisioning enabled":"local pilot authentication only; no chain spending"}`));
  for(const signal of ["SIGINT","SIGTERM"] as const)process.once(signal,()=>server.close(()=>store.close()));
}
main().catch(()=>{console.error("Guest gateway startup failed. Check its configuration and private key file; no credentials are logged.");process.exitCode=1;});
