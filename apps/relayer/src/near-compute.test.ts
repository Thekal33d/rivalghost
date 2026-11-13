import {it,expect,describe,vi} from 'vitest';
import {GuestStore} from './guest-store.js';
import {NearCompute,PILOT_MODEL,computeConfig} from './near-compute.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const config={enabled:true,apiKey:'test-private-key',model:PILOT_MODEL,dailyLimit:1,totalBudgetMicroUsd:1000000};
const response=(value:unknown)=>new Response(JSON.stringify(value),{status:200});
const model={id:PILOT_MODEL,owned_by:'nearai',is_ready:true,context_length:16384,max_output_length:8192,supported_features:['structured_outputs'],supported_sampling_parameters:['max_tokens'],pricing:{input:0.15,output:0.55,prompt:'0.00000015',completion:'0.00000055',request:'0',image:'0'}};
const catalog=()=>response({data:[model]});
function setup(request:typeof fetch){let now=1800000000000;const store=new GuestStore(':memory:','http://localhost:5173');return {store,now:()=>now,advance:(ms:number)=>now+=ms,make:(options=config)=>new NearCompute(store,options,((url,init)=>String(url).endsWith('/models')?Promise.resolve(catalog()):request(url,init)) as typeof fetch,()=>now)};}
describe('NEAR compute boundary',()=>{
 it('requires an explicit reviewed budget/model and parses dollar amounts exactly',()=>{
  const s=setup(vi.fn());try{
   expect(()=>s.make({...config,totalBudgetMicroUsd:0})).toThrow('total budget');
   expect(()=>s.make({...config,model:'unknown/model'})).toThrow('reviewed');
   expect(()=>s.make({...config,dailyLimit:5})).toThrow('daily');
   expect(computeConfig({NEAR_AI_TOTAL_BUDGET_USD:'1.000001'}).totalBudgetMicroUsd).toBe(1000001);
   for(const budget of ['-1','Infinity','5.000001','1e0','0.0000001'])expect(()=>computeConfig({NEAR_AI_TOTAL_BUDGET_USD:budget})).toThrow();
  }finally{s.store.close();}
 });
 it('keeps failed reservations across database reopen and a new day, blocking before network I/O',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'rivalghost-budget-')),file=join(folder,'pilot.sqlite');let now=1800000000000;
  let store=new GuestStore(file,'http://localhost:5173');const request=vi.fn(async(url:any)=>{if(String(url).endsWith('/models'))return catalog();throw new Error('uncertain-send');});
  const options={...config,totalBudgetMicroUsd:3000};
  try{
   const a=new NearCompute(store,options,request,()=>now);await a.decide(1,0);expect(a.status().budget.reservedUsd).toBe(0.003);expect(request).toHaveBeenCalledTimes(2);
   store.close();store=new GuestStore(file,'http://localhost:5173');now+=86400000;
   const b=new NearCompute(store,options,request,()=>now);expect((await b.decide(1,0)).reason).toContain('Total');expect(request).toHaveBeenCalledTimes(2);expect(b.status().budget.reservedUsd).toBe(0.003);
  }finally{store.close();rmSync(folder,{recursive:true,force:true});}
 });
 it('blocks inference when catalog pricing, privacy host or token limits change',async()=>{
  const variants=[{...model,pricing:{...model.pricing,input:0.16}}, {...model,pricing:{...model.pricing,request:'1'}}, {...model,pricing:{...model.pricing,prompt:'NaN'}}, {...model,context_length:32768}, {...model,owned_by:'third-party'}, {...model,is_ready:false}, {...model,supported_features:['reasoning']}];
  for(const changed of variants){const store=new GuestStore(':memory:','http://localhost:5173'),request=vi.fn(async(_url:any)=>response({data:[changed]}));try{const c=new NearCompute(store,config,request,()=>1800000000000);expect((await c.decide(1,0)).source).toBe('local');expect(request).toHaveBeenCalledTimes(1);expect(String(request.mock.calls[0][0])).toContain('/models');expect(c.status().budget.reservedUsd).toBe(0.003);}finally{store.close();}}
 });
 it('shares the durable reservation across service instances and caps the actual inference request',async()=>{
  const store=new GuestStore(':memory:','http://localhost:5173'),sent:any[]=[];
  const request:typeof fetch=async(url,init)=>{if(String(url).endsWith('/models'))return catalog();sent.push(JSON.parse(String(init?.body)));return response({choices:[{message:{content:'{"focus":"courier"}'}}]});};
  try{const a=new NearCompute(store,config,request,()=>1800000000000),b=new NearCompute(store,config,request,()=>1800000000000);await Promise.all([a.decide(1,0),b.decide(1,0)]);expect(sent).toHaveLength(1);expect(sent[0]).toMatchObject({model:PILOT_MODEL,max_tokens:64,stream:false});expect(a.status().budget.reservedUsd).toBe(0.003);}finally{store.close();}
 });
 it('makes no request without an enabled funded configuration',async()=>{const fetcher=vi.fn(),s=setup(fetcher);try{const c=s.make({...config,enabled:false});expect((await c.decide(0,0)).source).toBe('local');expect(await c.stake()).toEqual({state:'not-configured'});expect(fetcher).not.toHaveBeenCalled();expect(JSON.stringify(c.status())).not.toContain('test-private-key');}finally{s.store.close();}});
 it('shares one pending request, caches decisions, and persists the daily cap across restart',async()=>{const fetcher=vi.fn(async()=>response({id:'proof-is-not-attestation',choices:[{message:{content:'{"focus":"courier"}'}}]})),s=setup(fetcher);try{const c=s.make();const [a,b]=await Promise.all([c.decide(2,0),c.decide(2,0)]);expect(a).toEqual(b);expect(a).toMatchObject({focus:'courier',source:'near-ai'});expect(fetcher).toHaveBeenCalledTimes(1);await c.decide(3,1);expect(fetcher).toHaveBeenCalledTimes(1);s.advance(21600001);expect((await s.make().decide(2,0)).source).toBe('local');expect(fetcher).toHaveBeenCalledTimes(1);expect(c.status().callsToday).toBe(1);}finally{s.store.close();}});
 it('rejects model-proposed transfers and keeps a failed request charged to the allowance',async()=>{const fetcher=vi.fn(async()=>response({choices:[{message:{content:'{"focus":"courier","mint":100000}'}}]})),s=setup(fetcher);try{const c=s.make();expect(await c.decide(0,0)).toMatchObject({source:'local',focus:'recovery'});expect(c.status().callsToday).toBe(1);await c.decide(0,0);expect(fetcher).toHaveBeenCalledTimes(1);}finally{s.store.close();}});
 it('falls back on outages and oversized responses without exposing secrets',async()=>{for(const f of [vi.fn(async()=>{throw new Error('test-private-key');}),vi.fn(async()=>new Response('x'.repeat(40000)))]){const s=setup(f);try{const result=await s.make().decide(20,2);expect(result).toMatchObject({source:'local',focus:'courier'});expect(JSON.stringify(result)).not.toContain('test-private-key');}finally{s.store.close();}}});
 it('only accepts stake credit reports bound to the expected organization/account/configuration',async()=>{const org='11111111-1111-4111-8111-111111111111';let wrong=false;const f=vi.fn(async(url:any)=>response(String(url).endsWith('/config')?{enabled:true,contract_id:'farm.near',farm_product_id:'compute',network_id:'mainnet',sync_staleness_seconds:600}:{organization_id:org,near_account_id:wrong?'wrong.near':'operator.near',contract_id:'farm.near',farm_product_id:'compute',network_id:'mainnet',sync_status:'synced',farm_credit_nano_usd:100000000,last_synced_at:new Date(1800000000000).toISOString()}));const s=setup(f);try{const c=new NearCompute(s.store,{...config,stakeToken:'private-jwt',organization:org,nearAccount:'operator.near'},f,s.now);expect(await c.stake()).toMatchObject({state:'provider-reported',farmCreditNanoUsd:100000000,stale:false});await c.stake();expect(f).toHaveBeenCalledTimes(2);s.advance(300001);wrong=true;expect(await c.stake()).toEqual({state:'unavailable'});}finally{s.store.close();}});
});
