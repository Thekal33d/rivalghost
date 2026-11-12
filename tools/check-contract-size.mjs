import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const artifact=new URL('../target/wasm32-unknown-unknown/release/rivalghost_contract.wasm',import.meta.url);
const bytes=await readFile(artifact);
const budgetBytes=100000;
const report={artifact:'target/wasm32-unknown-unknown/release/rivalghost_contract.wasm',bytes:bytes.length,budgetBytes,passed:bytes.length<budgetBytes,sha256:createHash('sha256').update(bytes).digest('hex')};
console.log(JSON.stringify(report,null,2));
if(!report.passed){console.error('Deployment size gate failed. Optimize the contract before deployment; do not silently raise the budget.');process.exitCode=1;}
