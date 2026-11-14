// Read-only public evidence. No credentials, signing, funding, or chain writes.
import {createHash} from 'node:crypto';
const site='https://rivalghost.xyz';
const rpcUrl='https://test.rpc.fastnear.com';
const account='game.rivalghost-ops-thekal33d.testnet';
async function json(url,options={}) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}
async function query(params) {
  const body=await json(rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'public-evidence',method:'query',params:{...params,account_id:account,finality:'final'}})});
  if(body.error)throw new Error(JSON.stringify(body.error));
  return body.result;
}
try {
  const out={checkedAt:new Date().toISOString(),site,rpcUrl,account,public:{}};
  for(const route of ['health','chain/config','embedded/config'])out.public[route]=await json(`${site}/api/guest/${route}`);
  const state=await query({request_type:'view_account'});
  out.contract={blockHeight:state.block_height,codeHash:state.code_hash,storageUsageBytes:state.storage_usage};
  const code=await query({request_type:'view_code'}),bytes=Buffer.from(code.code_base64,'base64');
  out.bytecode={blockHeight:code.block_height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),budgetBytes:100000};
  const world=await query({request_type:'call_function',method_name:'get_world',args_base64:'e30='});
  out.world={blockHeight:world.block_height,state:JSON.parse(Buffer.from(world.result).toString())};
  console.log(JSON.stringify(out,null,2));
  if(bytes.length>=100000)throw new Error('Public bytecode is not below 100,000 bytes');
} catch(error) {console.error(`Public verification failed: ${error.message}`);process.exitCode=1;}
