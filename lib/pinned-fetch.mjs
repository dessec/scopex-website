import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { denoPinnedRequest } from './raw-http.mjs';
import { assertPublicUrl, publicAddress } from './public-homepage.mjs';

// Resolve, validate, and connect to that exact address. TLS SNI and Host retain
// the original domain. This closes the DNS-rebinding gap in plain fetch().
export function createPinnedFetcher({dnsFetch=fetch,http=httpRequest,https=httpsRequest}={}) {
  return async function pinnedFetch(input, options={}) {
    const url=new URL(input);
    if(url.origin==='https://cloudflare-dns.com' && url.pathname==='/dns-query') return dnsFetch(input,options);
    assertPublicUrl(url);
    const groups=await Promise.all(['A','AAAA'].map(async type=>{
      const response=await dnsFetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(url.hostname)+'&type='+type,{headers:{accept:'application/dns-json'},signal:options.signal,redirect:'error'});
      if(!response.ok) throw new Error('Could not verify the website address.');
      const answer=await response.json();
      if(![0,3].includes(answer.Status)) throw new Error('Could not resolve the website address.');
      return (answer.Answer||[]).filter(x=>x.type===1||x.type===28).map(x=>x.data);
    }));
    const ips=groups.flat();
    if(!ips.length||ips.some(ip=>!publicAddress(ip))) throw new Error('This address does not resolve exclusively to a public website.');
    const ip=ips.find(x=>!x.includes(':'))||ips[0];
    if(globalThis.Deno?.connect) return denoPinnedRequest(url,ip,options.signal);
    return new Promise((resolve,reject)=>{
      const request=(url.protocol==='https:'?https:http)({
        hostname:ip,port:url.protocol==='https:'?443:80,servername:url.hostname,
        method:'GET',path:url.pathname+url.search,agent:false,rejectUnauthorized:true,
        headers:{accept:'text/html,application/xhtml+xml','user-agent':'ScopeX-Homepage-Check/1.0','accept-encoding':'identity',host:url.host},
        signal:options.signal,maxHeaderSize:32768
      },incoming=>{
        const headers=new Headers();
        for(const [name,value] of Object.entries(incoming.headers)) if(value!==undefined) headers.set(name,Array.isArray(value)?value.join(', '):String(value));
        if(headers.has('content-encoding') && headers.get('content-encoding')!=='identity') {incoming.destroy(); reject(new Error('This website requires a manual review because it returned an unsupported compressed response.'));return;}
        const status=incoming.statusCode||502;
        if([204,205,304].includes(status)){incoming.resume();resolve(new Response(null,{status,headers}));}
        else resolve(new Response(Readable.toWeb(incoming),{status,headers}));
      });
      request.on('error',(error)=>{console.warn('Pinned request failed:',error.code,error.message);reject(new Error('We could not securely connect to this website. It may block automated checks.'));});
      request.end();
    });
  };
}
export const pinnedFetch=createPinnedFetcher();
