import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import binaryen from 'binaryen';
const root=new URL('../',import.meta.url);
const built=spawnSync('cargo',['build','--locked','--release','--target','wasm32-unknown-unknown','-p','rivalghost-contract'],{cwd:root,stdio:'inherit'});
if(built.status!==0)process.exit(built.status??1);
const raw=await readFile(new URL('target/wasm32-unknown-unknown/release/rivalghost_contract.wasm',root));
const module=binaryen.readBinary(raw),f=binaryen.Features;
// Match the existing Rust feature set; never enable experimental compact imports/GC.
module.setFeatures(f.MutableGlobals|f.NontrappingFPToInt|f.BulkMemory|f.BulkMemoryOpt|f.SignExt|f.ReferenceTypes|f.Multivalue);
binaryen.setOptimizeLevel(2);binaryen.setShrinkLevel(2);
module.optimize();module.runPasses(['strip-debug','strip-dwarf','strip-producers']);
const optimized=module.emitBinary();
if(!module.validate()||!WebAssembly.validate(optimized))throw new Error('Invalid optimized contract');
const imports=WebAssembly.Module.imports(await WebAssembly.compile(optimized)).map(x=>x.name);
if(!imports.includes('sha256')||!imports.includes('panic_utf8'))throw new Error('Missing NEAR host configuration');
await mkdir(new URL('target/near/',root),{recursive:true});
await writeFile(new URL('target/near/rivalghost_contract.wasm',root),optimized);module.dispose();
console.log(JSON.stringify({rawBytes:raw.length,optimizedBytes:optimized.length},null,2));
