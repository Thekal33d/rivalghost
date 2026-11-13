import {encodeEconomyCertificate,type ChainPilot,type ChainWorld,type EconomyIntent,type EconomyCertificate} from '@rivalghost/game-data';
import type {NearContractTransport} from './index.js';

/** A change transport must await a finalized transaction outcome. */
export class EconomyContractClient {
 constructor(readonly transport:NearContractTransport,readonly contractId:string){if(!contractId.endsWith('.testnet'))throw new Error('Testnet contract required');}
 world(){return this.transport.view<ChainWorld>(this.contractId,'get_world',{});}
 pilot(actor:string){return this.transport.view<ChainPilot|null>(this.contractId,'get_pilot',{actor});}
 sequence(){return this.transport.view<number>(this.contractId,'next_sequence',{});}
 join(){return this.transport.change<ChainPilot>(this.contractId,'join',{});}
 session(public_key:number[],until:number){return this.transport.change<ChainPilot>(this.contractId,'set_session',{public_key,until});}
 execute(intent:EconomyIntent){return this.transport.change<ChainPilot>(this.contractId,'execute',{intent});}
 settle(certificate:EconomyCertificate){return this.transport.change<ChainPilot>(this.contractId,'settle',{certificate:encodeEconomyCertificate(certificate)});}
 seed(certificate:EconomyCertificate){return this.transport.change<void>(this.contractId,'seed_crown',{certificate:encodeEconomyCertificate(certificate)});}
 expire(actor:string){return this.transport.change<ChainPilot>(this.contractId,'expire',{actor});}
 close(slot:number){return this.transport.change<void>(this.contractId,'close_crown',{slot});}
}
