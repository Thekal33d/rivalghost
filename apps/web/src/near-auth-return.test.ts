import {it,expect} from 'vitest';
import {isNearAuthReturn} from './near-auth-return';
it('recognizes root code/error callbacks without treating ordinary game links as login returns',()=>{for(const path of ['/?code=c&state=s','/?error=denied&state=s','/auth/callback?code=c&state=s'])expect(isNearAuthReturn(new URL(path,'http://localhost:3000'))).toBe(true);for(const path of ['/','/?state=s','/?code=c','/game?code=c&state=s'])expect(isNearAuthReturn(new URL(path,'http://localhost:3000'))).toBe(false);});
