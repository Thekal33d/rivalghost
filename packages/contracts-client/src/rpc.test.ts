import {describe,it,expect} from "vitest";
import {NearRpcViews} from "./rpc.js";
import {WalletContractTransport,PendingTransactionError} from "./wallet-transport.js";
const response=(result:unknown)=>new Response(JSON.stringify({jsonrpc:"2.0",result}));
describe("NEAR finalized transport",()=>{
  it("reads a view at finality and can pin subsequent reads to its block",async()=>{
    const calls:any[]=[];
    const rpc=new NearRpcViews("https://rpc.example.test",async(_url,init)=>{calls.push(JSON.parse(String(init?.body)));return response({result:[...new TextEncoder().encode('{"id":7}')],block_hash:"block-7"});});
    const first=await rpc.viewWithBlock("game.testnet","get_challenge",{challenge_id:7});
    await rpc.viewWithBlock("game.testnet","get_crown",{crown_id:3},first.blockHash);
    expect(first.value).toEqual({id:7});expect(calls[0].params.finality).toBe("final");expect(calls[1].params.block_id).toBe("block-7");
    expect(JSON.parse(atob(calls[0].params.args_base64))).toEqual({challenge_id:7});
  });
  it("refuses RPC errors, corrupt bytes and mainnet",async()=>{
    for(const result of [{result:[999],block_hash:"a"},{result:[0],block_hash:"a"}]) {
      const rpc=new NearRpcViews("https://rpc.example.test",async()=>response(result));
      await expect(rpc.view("x.testnet","get_crown",{})).rejects.toThrow("Invalid NEAR");
    }
    const rpc=new NearRpcViews("https://rpc.example.test",async()=>response({chain_id:"mainnet"}));
    await expect(rpc.assertTestnet()).rejects.toThrow("testnet");
  });
  it("requires FINAL execution and propagates contract failure",async()=>{
    for(const result of [{final_execution_status:"EXECUTED",status:{SuccessValue:btoa('{}')}},{final_execution_status:"FINAL",status:{Failure:{}}}]) {
      const rpc=new NearRpcViews("https://rpc.example.test",async()=>response(result));
      await expect(rpc.transactionResult("hash","player.testnet")).rejects.toThrow();
    }
  });
  it("uses a scoped zero-deposit call and recovers pending results without resubmitting",async()=>{
    let final=false,sends=0;const calls:any[]=[];
    const rpc=new NearRpcViews("https://rpc.example.test",async(_url,init)=>{
      const request=JSON.parse(String(init?.body));calls.push(request);
      if(request.method==="status")return response({chain_id:"testnet"});
      return response({final_execution_status:final?"FINAL":"EXECUTED",status:{SuccessValue:btoa('{"challenge_id":7}')}});
    });
    const wallet={async signAndSendTransaction(t:any){sends++;expect(t.actions[0].params.deposit).toBe("0");return {transaction:{hash:"tx-7",signer_id:"player.testnet"}};}};
    const transport=new WalletContractTransport(rpc,wallet,"game.testnet","player.testnet");
    let pending:PendingTransactionError|undefined;
    try{await transport.change("game.testnet","settle_challenge",{});}catch(error){pending=error as PendingTransactionError;}
    expect(pending).toBeInstanceOf(PendingTransactionError);final=true;
    expect(await transport.confirm(pending!)).toEqual({challenge_id:7});expect(sends).toBe(1);
    expect(calls.at(-1).params.wait_until).toBe("FINAL");
    await expect(transport.change("game.testnet","create_guest",{})).rejects.toThrow("allowed");
  });
});
