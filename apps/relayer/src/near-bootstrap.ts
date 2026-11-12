import {Account,JsonRpcProvider,PublicKey,KeyType,actions,type KeyPairString} from "near-api-js";
import {AccountDoesNotExistError} from "near-api-js/rpc-errors";
import {createHash} from "node:crypto";
import {GUEST_METHODS} from "@rivalghost/game-data";
import type {GuestProvisioner} from "./guest-service.js";
export interface BootstrapConfig {parentId:string;contractId:string;rpcUrl:string;privateKey:KeyPairString;fundingYocto:bigint;gasPriceCap:bigint}
/** No instance is constructed until bootstrap is explicitly enabled and funded configuration exists. */
export class NearGuestProvisioner implements GuestProvisioner {
  readonly rpc:JsonRpcProvider;private readonly operator:Account;readonly reserveYocto:bigint;
  constructor(private readonly config:BootstrapConfig) {
    if(!config.parentId.endsWith(".testnet")||!config.contractId.endsWith(".testnet")||config.parentId.length>42||config.fundingYocto<=0n||config.gasPriceCap<=0n)throw new Error("Invalid testnet bootstrap configuration");
    const url=new URL(config.rpcUrl);if(url.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(url.hostname))throw new Error("RPC must use HTTPS");
    this.rpc=new JsonRpcProvider({url:config.rpcUrl});this.operator=new Account(config.parentId,this.rpc,config.privateKey);
    // Two transactions at the protocol's 300 Tgas ceiling plus the child funding.
    // Each retry reserves again; uncertainty never releases spending capacity.
    this.reserveYocto=config.fundingYocto+600000000000000n*config.gasPriceCap;
  }
  async checkConfiguration(){
    if(await this.rpc.getNetworkId()!=="testnet")throw new Error("Only testnet is allowed");
    const operator=await this.rpc.callFunction({contractId:this.config.contractId,method:"operator",args:{},blockQuery:{finality:"final"}});
    if(operator!==this.config.parentId)throw new Error("Guest parent must be the contract operator");
  }
  accountId(publicKey:string){return `g${createHash("sha256").update(publicKey).digest("hex").slice(0,20)}.${this.config.parentId}`;}
  private async gasGate(){if(BigInt((await this.rpc.viewGasPrice()).gas_price)>this.config.gasPriceCap)throw new Error("Network gas exceeds the sponsorship cap");}
  private async exists(accountId:string){
    try{await this.rpc.viewAccount({accountId,blockQuery:{finality:"final"}});return true;}
    catch(error){if(error instanceof AccountDoesNotExistError)return false;throw error;}
  }
  async ensureAccount(accountId:string,publicKey:string){
    if(accountId!==this.accountId(publicKey)||!/^[a-f0-9]{64}$/.test(publicKey))throw new Error("Guest account does not match its key");
    const key=new PublicKey({keyType:KeyType.ED25519,data:Buffer.from(publicKey,"hex")});
    if(!await this.exists(accountId)) {
      await this.gasGate();
      try{
        await this.operator.signAndSendTransaction({receiverId:accountId,actions:[actions.createAccount(),actions.transfer(this.config.fundingYocto),actions.addFunctionCallAccessKey(key,this.config.contractId,[...GUEST_METHODS],0n)],waitUntil:"FINAL",throwOnFailure:true,retries:0});
      }catch(error){if(!await this.exists(accountId))throw error;}
    }
    // A retry adopts only an account that has exactly the expected restricted key.
    const access=await this.rpc.viewAccessKeyList({accountId,limit:2,finalityQuery:{finality:"final"}});
    const permission=access.keys[0]?.access_key.permission;
    if(access.keys.length!==1||access.keys[0].public_key!==key.toString()||typeof permission!=="object"||!("FunctionCall" in permission))throw new Error("Guest key permissions do not match");
    const call=permission.FunctionCall;
    if(call.receiver_id!==this.config.contractId||String(call.allowance)!=="0"||[...call.method_names].sort().join(",")!==[...GUEST_METHODS].sort().join(","))throw new Error("Guest key permissions do not match");
  }
  async ensureGrant(accountId:string){
    const granted=()=>this.rpc.callFunction<boolean>({contractId:this.config.contractId,method:"has_guest_grant",args:{account_id:accountId},blockQuery:{finality:"final"}});
    if(await granted())return;
    await this.gasGate();
    try{await this.operator.signAndSendTransaction({receiverId:this.config.contractId,actions:[actions.functionCall("create_guest",{account_id:accountId},30000000000000n,0n)],waitUntil:"FINAL",throwOnFailure:true,retries:0});}
    catch(error){if(!await granted())throw error;}
    if(!await granted())throw new Error("Guest credit grant is not confirmed");
  }
}
