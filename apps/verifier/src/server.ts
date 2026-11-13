import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {NearRpcViews} from "@rivalghost/contracts-client";
import {NearChallengeSource} from "./challenge-source.js";
import {FileReplayStore} from "./replay-store.js";
import {ReplayVerificationService} from "./service.js";
import {createVerifierServer} from "./http.js";

async function main() {
  const contractId=process.env.CONTRACT_ID, keyFile=process.env.CERTIFICATE_KEY_FILE, token=process.env.VERIFIER_SERVICE_TOKEN;
  if(process.env.NEAR_NETWORK!=="testnet"||!contractId||!keyFile||!token)throw new Error("Set NEAR_NETWORK=testnet, CONTRACT_ID, CERTIFICATE_KEY_FILE and VERIFIER_SERVICE_TOKEN before starting the verifier");
  const rpc=new NearRpcViews(process.env.NEAR_RPC_URL??"https://test.rpc.fastnear.com");
  const source=new NearChallengeSource(rpc,contractId);
  let jwk:JsonWebKey,key:CryptoKey;
  try {
    jwk=JSON.parse(await readFile(keyFile,"utf8"));
    key=await crypto.subtle.importKey("jwk",jwk,"Ed25519",false,["sign"]);
  } catch {throw new Error("Cannot load verifier signing key; check the private JWK file");}
  await rpc.assertTestnet();
  const [publicKey,keyVersion]=await Promise.all([rpc.view<number[]>(contractId,"verifier_public_key",{}),rpc.view<number>(contractId,"verifier_key_version",{})]);
  if(!jwk.x||Buffer.from(jwk.x,"base64url").toString("hex")!==Buffer.from(publicKey).toString("hex"))throw new Error("Verifier signing key does not match the deployed contract");
  const probe=new TextEncoder().encode("RIVALGHOST-VERIFIER-KEY-CHECK");
  const signature=await crypto.subtle.sign("Ed25519",key,probe);
  const publicCryptoKey=await crypto.subtle.importKey("raw",Uint8Array.from(publicKey),"Ed25519",false,["verify"]);
  if(!await crypto.subtle.verify("Ed25519",publicCryptoKey,signature,probe))throw new Error("Verifier key pair does not match");
  const replays=new FileReplayStore(resolve(process.env.REPLAY_DIRECTORY??"./replays"));
  const service=new ReplayVerificationService(source,key,keyVersion,replays,Date.now);
  const port=Number(process.env.PORT??8787);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error("Invalid verifier port");
  const server=createVerifierServer(service,token);
  server.listen(port,"127.0.0.1",()=>console.log(`RivalGhost verifier listening on 127.0.0.1:${port} for ${contractId}`));
  for(const signal of ["SIGINT","SIGTERM"] as const)process.once(signal,()=>server.close());
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Verifier startup failed");process.exitCode=1;});
