import {afterEach,it,expect,vi} from "vitest";
import {Account,JsonRpcProvider,KeyPair,PublicKey,KeyType} from "near-api-js";
import {AccountDoesNotExistError} from "near-api-js/rpc-errors";
import {GUEST_METHODS} from "@rivalghost/game-data";
import {NearGuestProvisioner} from "./near-bootstrap.js";
const publicKey="ab".repeat(32);
function setup(){
  const provider=new NearGuestProvisioner({parentId:"operator.testnet",contractId:"game.testnet",rpcUrl:"https://rpc.testnet.near.org",privateKey:KeyPair.fromRandom("ed25519").toString(),fundingYocto:100n,gasPriceCap:2n});
  const key=new PublicKey({keyType:KeyType.ED25519,data:Buffer.from(publicKey,"hex")}).toString();
  const keys={keys:[{public_key:key,access_key:{nonce:0,permission:{FunctionCall:{receiver_id:"game.testnet",allowance:"0",method_names:[...GUEST_METHODS]}}}}]};
  return {provider,keys,id:provider.accountId(publicKey)};
}
afterEach(()=>vi.restoreAllMocks());
it("never adopts a guest account with full access or a different receiver",async()=>{
  const {provider,keys,id}=setup();vi.spyOn(JsonRpcProvider.prototype,"viewAccount").mockResolvedValue({} as any);
  const access=vi.spyOn(JsonRpcProvider.prototype,"viewAccessKeyList").mockResolvedValue({keys:[{...keys.keys[0],access_key:{nonce:0,permission:"FullAccess"}}]} as any);
  await expect(provider.ensureAccount(id,publicKey)).rejects.toThrow("permissions");
  keys.keys[0].access_key.permission.FunctionCall.receiver_id="other.testnet";access.mockResolvedValue(keys as any);
  await expect(provider.ensureAccount(id,publicKey)).rejects.toThrow("permissions");
});
it("recovers an uncertain account creation with its exact scoped key, without transferring twice",async()=>{
  const {provider,keys,id}=setup();
  vi.spyOn(JsonRpcProvider.prototype,"viewAccount").mockRejectedValueOnce(Object.create(AccountDoesNotExistError.prototype)).mockResolvedValue({} as any);
  vi.spyOn(JsonRpcProvider.prototype,"viewGasPrice").mockResolvedValue({gas_price:"1"} as any);
  vi.spyOn(JsonRpcProvider.prototype,"viewAccessKeyList").mockResolvedValue(keys as any);
  const send=vi.spyOn(Account.prototype,"signAndSendTransaction").mockRejectedValue(new Error("timeout after broadcast"));
  await provider.ensureAccount(id,publicKey);await provider.ensureAccount(id,publicKey);
  expect(send).toHaveBeenCalledTimes(1);const transaction=send.mock.calls[0][0];expect(transaction.receiverId).toBe(id);expect(transaction.retries).toBe(0);
  expect(transaction.actions).toHaveLength(3);const action=transaction.actions[2] as any;expect(action.addKey.accessKey.permission.functionCall.allowance).toBe(0n);expect(action.addKey.accessKey.permission.functionCall.methodNames).toEqual([...GUEST_METHODS]);
});
it("halts before sending when gas exceeds its reserved cap",async()=>{
  const {provider,id}=setup();vi.spyOn(JsonRpcProvider.prototype,"viewAccount").mockRejectedValue(Object.create(AccountDoesNotExistError.prototype));
  vi.spyOn(JsonRpcProvider.prototype,"viewGasPrice").mockResolvedValue({gas_price:"3"} as any);const send=vi.spyOn(Account.prototype,"signAndSendTransaction");
  await expect(provider.ensureAccount(id,publicKey)).rejects.toThrow("cap");expect(send).not.toHaveBeenCalled();expect(provider.reserveYocto).toBe(1200000000000100n);
});
it("checks grant history instead of regranting a spent balance",async()=>{
  const {provider,id}=setup();const view=vi.spyOn(JsonRpcProvider.prototype,"callFunction").mockResolvedValue(true);const send=vi.spyOn(Account.prototype,"signAndSendTransaction");
  await provider.ensureGrant(id);expect(view.mock.calls[0][0].method).toBe("has_guest_grant");expect(send).not.toHaveBeenCalled();
});
