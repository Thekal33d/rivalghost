import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import binaryen from 'binaryen';
const root=new URL('../',import.meta.url);
const economy=process.argv.includes('--economy'), name=economy?'rivalghost_economy':'rivalghost_contract';
const built=spawnSync('cargo',['build','--locked','--release','--target','wasm32-unknown-unknown','-p',economy?'rivalghost-economy':'rivalghost-contract'],{cwd:root,stdio:'inherit'});
if(built.status!==0)process.exit(built.status??1);
const raw=await readFile(new URL(`target/wasm32-unknown-unknown/release/${name}.wasm`,root));
const module=binaryen.readBinary(raw),f=binaryen.Features;
// Match the existing Rust feature set; never enable experimental compact imports/GC.
module.setFeatures(f.MutableGlobals|f.NontrappingFPToInt|f.BulkMemory|f.BulkMemoryOpt|f.SignExt|f.ReferenceTypes);
binaryen.setOptimizeLevel(2);binaryen.setShrinkLevel(2);
module.optimize();
// Restructure redundant control flow, then shrink again using the same restricted features.
module.runPasses(['flatten','rereloop']);module.optimize();
module.runPasses(['strip-debug','strip-dwarf','strip-producers']);
const optimized=module.emitBinary();
if(!module.validate()||!WebAssembly.validate(optimized))throw new Error('Invalid optimized contract');
const imports=WebAssembly.Module.imports(await WebAssembly.compile(optimized)).map(x=>x.name);
if(!imports.includes('sha256')||!imports.includes('panic_utf8'))throw new Error('Missing NEAR host configuration');
await mkdir(new URL('target/near/',root),{recursive:true});
await writeFile(new URL(`target/near/${name}.wasm`,root),optimized);module.dispose();
if(optimized.length>=100000)throw new Error('Contract exceeds strict 100,000-byte ceiling');
console.log(JSON.stringify({rawBytes:raw.length,optimizedBytes:optimized.length},null,2));
