import {describe,it,expect} from 'vitest';
import {flyHound} from '@rivalghost/sim';
import {economyCertificateMessage,encodeEconomyCertificate,economyIntentMessage,type ChainRun} from '@rivalghost/game-data';
import {verifyEconomyReplay} from './economy.js';
describe('v3 economic verifier',()=>{
 const flight=flyHound({rulesVersion:3,chapter:0,rig:'fan',seed:313},'rescuer');
 const run:ChainRun={id:7,kind:1,slot:0,chapter:0,seed:313,stage:2,bonus:true,day:0,started:1000,expires:901000};
 it('signs only replay-derived rewards with contract, mission and frozen repair context',async()=>{
  const key=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']);
  const c=await verifyEconomyReplay('game.testnet','alice.testnet',run,flight.replay,2000,1,key.privateKey);
  expect(c.score).toBe(flight.result.score);expect(c.kills).toBe(flight.result.kills);expect(c.stage).toBe(2);expect(c.bonus).toBe(true);
  expect(encodeEconomyCertificate(c).length).toBeLessThan(512);
  const check=(contract:string,value= c)=>crypto.subtle.verify('Ed25519',key.publicKey,Uint8Array.from(c.signature),new TextEncoder().encode(economyCertificateMessage(contract,value)));
  expect(await check('game.testnet')).toBe(true);expect(await check('other.testnet')).toBe(false);expect(await check('game.testnet',{...c,kills:c.kills+1})).toBe(false);
 });
 it('rejects mismatched missions, expired days and incomplete replays',async()=>{
  const key=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']);
  for(const altered of [{...flight.replay,seed:314},{...flight.replay,rig:'guard' as const},{...flight.replay,rulesVersion:2 as const},{...flight.replay,runs:[]}])await expect(verifyEconomyReplay('game.testnet','alice.testnet',run,altered,2000,1,key.privateKey)).rejects.toThrow();
  await expect(verifyEconomyReplay('game.testnet','alice.testnet',run,flight.replay,901000,1,key.privateKey)).rejects.toThrow('active');
  await expect(verifyEconomyReplay('game.testnet','alice.testnet',{...run,expires:86401000},flight.replay,86400000,1,key.privateKey)).rejects.toThrow('day');
 });
 it('rejects unsafe numeric encodings and binds every action parameter',()=>{
  const i={actor:'alice.testnet',nonce:1,epoch:2,deadline:3000,op:6,a:0,b:20,signature:[]};
  expect(economyIntentMessage('game.testnet',i)).not.toBe(economyIntentMessage('game.testnet',{...i,b:21}));
  expect(()=>economyIntentMessage('game.testnet',{...i,nonce:Number.MAX_SAFE_INTEGER+1})).toThrow();
 });
});
