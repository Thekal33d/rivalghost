import type {NearContractTransport} from "./index.js";
import {NearRpcViews} from "./rpc.js";

/** Structural boundary compatible with NEAR Wallet Selector's selected wallet. */
export interface CompetitionWallet {
  signAndSendTransaction(transaction:{receiverId:string;actions:{type:"FunctionCall";params:{methodName:string;args:Record<string,unknown>;gas:string;deposit:string}}[]}):Promise<unknown>;
}
export class PendingTransactionError extends Error {
  constructor(readonly hash:string,readonly signerId:string,readonly method:string) {super("Transaction submitted; confirmation is unavailable. Check this transaction before retrying.");}
}
const METHODS=new Set(["start_challenge","settle_challenge","defend_crown","expire_challenge"]);
/** Signs only the game ABI. A wallet response alone never counts as settlement. */
export class WalletContractTransport implements NearContractTransport {
  constructor(private readonly rpc:NearRpcViews,private readonly wallet:CompetitionWallet,readonly contractId:string,readonly accountId:string) {
    if(!contractId.endsWith(".testnet"))throw new Error("Testnet contract required");
  }
  view<Result>(contractId:string,method:string,args:Record<string,unknown>):Promise<Result> {
    if(contractId!==this.contractId)throw new Error("Unexpected contract");
    return this.rpc.view<Result>(contractId,method,args);
  }
  async change<Result>(contractId:string,method:string,args:Record<string,unknown>):Promise<Result> {
    if(contractId!==this.contractId || !METHODS.has(method))throw new Error("Contract method is not allowed");
    await this.rpc.assertTestnet();
    const outcome=await this.wallet.signAndSendTransaction({receiverId:contractId,actions:[{type:"FunctionCall",params:{methodName:method,args,gas:"30000000000000",deposit:"0"}}]}) as {transaction?:{hash?:string;signer_id?:string}}|undefined;
    if(!outcome?.transaction?.hash || outcome.transaction.signer_id!==this.accountId)throw new Error("Wallet returned no matching transaction; check your wallet activity before retrying");
    try{return await this.rpc.transactionResult<Result>(outcome.transaction.hash,this.accountId);}
    catch(error){
      if(error instanceof Error && error.message==="NEAR transaction failed")throw error;
      throw new PendingTransactionError(outcome.transaction.hash,this.accountId,method);
    }
  }
  /** Recovery is read-only: it never submits a second transaction. */
  confirm<Result>(pending:PendingTransactionError):Promise<Result> {return this.rpc.transactionResult<Result>(pending.hash,pending.signerId);}
}
