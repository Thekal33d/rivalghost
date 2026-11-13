import {fileURLToPath} from 'node:url';
import {GuestStore} from '../apps/relayer/dist/guest-store.js';
import {NearCompute,computeConfig} from '../apps/relayer/dist/near-compute.js';
let store;
try {
  process.loadEnvFile(fileURLToPath(new URL('../apps/relayer/.env',import.meta.url)));
  const config=computeConfig(process.env);
  store=new GuestStore(':memory:','http://localhost:5173');
  // Validate enabled-mode requirements in an isolated database, without calling decide().
  const compute=new NearCompute(store,{...config,enabled:true});
  await compute.checkModelPrice();
  console.log(JSON.stringify({keyConfigured:!!config.apiKey,enabled:config.enabled,model:config.model,budget:compute.status().budget,catalogValidated:true,paidRequestMade:false},null,2));
} catch {
  console.error('NEAR AI preflight failed. Check the private configuration and provider availability. No inference request was sent; credentials were not printed.');
  process.exitCode=1;
} finally {store?.close();}
