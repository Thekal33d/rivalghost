import {expect,it} from 'vitest';
import {proxyClientIp} from './guest-http.js';
it('does not trust forwarded addresses by default or from remote sockets',()=>{
 expect(proxyClientIp('127.0.0.1','203.0.113.9',false)).toBe('127.0.0.1');
 expect(proxyClientIp('198.51.100.8','203.0.113.9',true)).toBe('198.51.100.8');
});
it('separates players behind the explicitly trusted local proxy',()=>{
 expect(proxyClientIp('127.0.0.1','203.0.113.9',true)).toBe('203.0.113.9');
 expect(proxyClientIp('::ffff:127.0.0.1','2001:db8::9',true)).toBe('2001:db8::9');
});
it('rejects ambiguous, repeated or malformed forwarded addresses',()=>{
 for(const value of ['203.0.113.9, 198.51.100.8','garbage',['203.0.113.9'],undefined])expect(proxyClientIp('127.0.0.1',value,true)).toBe('127.0.0.1');
});
