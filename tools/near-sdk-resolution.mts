import {createRequire} from 'node:module';
/** NEAR 2.0.2's ESM barrels export erased TypeScript types. Use each
 * importer's own CommonJS entry without collapsing NEAR 5/7 dependencies. */
export function nearSdkResolution(){return {name:'near-sdk-commonjs',enforce:'pre' as const,resolveId(source:string,importer?:string){
 if(!importer||!/^@near-js\/[a-z-]+$/.test(source))return null;
 const entry=createRequire(importer.split('?')[0]).resolve(source);
 return /@near-js\+[^/]+@2\.0\.2/.test(entry)?entry:null;
}};}
