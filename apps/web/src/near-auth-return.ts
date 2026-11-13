/** Root callbacks support the shared testnet sample; hosted apps use /auth/callback. */
export function isNearAuthReturn(url=new URL(location.href)){return url.pathname==='/auth/callback'||url.pathname==='/'&&url.searchParams.has('state')&&(url.searchParams.has('code')||url.searchParams.has('error'));}
