// Bounded HTTP/1.1 transport for Deno Edge Runtime. It connects to the validated
// numeric IP, then verifies TLS against the original hostname using startTls.
// No second DNS lookup, credential forwarding, automatic redirect, or TLS bypass.
const MAX=1500000;
export async function readHttpResponse(conn){
  let pending=new Uint8Array(0),ended=false;
  async function refill(){const buffer=new Uint8Array(16384);const count=await conn.read(buffer);if(count===null){ended=true;return;}const next=new Uint8Array(pending.length+count);next.set(pending);next.set(buffer.subarray(0,count),pending.length);pending=next;}
  async function line(){for(;;){for(let i=0;i<pending.length-1;i++){if(pending[i]===13&&pending[i+1]===10){const value=new TextDecoder().decode(pending.subarray(0,i));pending=pending.subarray(i+2);return value;}}if(pending.length>8192||ended)throw new Error('Invalid HTTP response.');await refill();}}
  async function bytes(size){while(pending.length<size&&!ended)await refill();if(pending.length<size)throw new Error('The website returned an incomplete response.');const result=pending.slice(0,size);pending=pending.subarray(size);return result;}
  let status=0,headers;
  for(let interim=0;interim<4;interim++){
    const first=await line(),match=/^HTTP\/1\.[01] (\d{3})(?: |$)/.exec(first);
    if(!match)throw new Error('Invalid HTTP response.');
    status=Number(match[1]);headers=new Headers();let size=first.length;
    for(;;){const h=await line();size+=h.length+2;if(size>32768)throw new Error('The website returned excessive headers.');if(!h)break;const colon=h.indexOf(':');if(colon<1)throw new Error('Invalid HTTP headers.');headers.append(h.slice(0,colon),h.slice(colon+1).trim());}
    if(status>=200)break;
  }
  if(status<200||status>599)throw new Error('Unsupported HTTP response.');
  if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')throw new Error('This website needs a manual review because it returned an unsupported compressed response.');
  if([204,205,304].includes(status))return new Response(null,{status,headers});
  // Redirects and errors need no downloaded body.
  if(status>=300)return new Response(null,{status,headers});
  const chunks=[];let total=0;
  const append=(chunk)=>{total+=chunk.length;if(total>MAX)throw new Error('This homepage is too large for the quick check.');chunks.push(chunk);};
  const transfer=headers.get('transfer-encoding'),length=headers.get('content-length');
  if(transfer){
    if(transfer.toLowerCase()!=='chunked'||length)throw new Error('Unsupported HTTP response framing.');
    for(;;){const token=(await line()).split(';',1)[0];if(!/^[0-9a-f]+$/i.test(token))throw new Error('Invalid chunked response.');const n=parseInt(token,16);if(!Number.isSafeInteger(n)||n>MAX-total)throw new Error('This homepage is too large for the quick check.');if(n===0){let trailerSize=0;for(;;){const trailer=await line();trailerSize+=trailer.length+2;if(trailerSize>32768)throw new Error('Excessive HTTP trailers.');if(!trailer)break;}break;}append(await bytes(n));if((await line())!=='')throw new Error('Invalid chunked response.');}
  }else if(length!==null){
    if(!/^\d+$/.test(length)||Number(length)>MAX)throw new Error('This homepage is too large for the quick check.');
    append(await bytes(Number(length)));
  }else{
    for(;;){if(pending.length){append(pending.slice());pending=new Uint8Array(0);}if(ended)break;await refill();}
  }
  const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  headers.delete('transfer-encoding');
  return new Response(body,{status,headers});
}
export async function denoPinnedRequest(url,ip,signal,runtime=globalThis.Deno){
  let conn;
  const close=()=>{try{conn?.close();}catch{}};
  signal?.throwIfAborted();
  signal?.addEventListener('abort',close,{once:true});
  try{
    conn=await runtime.connect({hostname:ip,port:url.protocol==='https:'?443:80,transport:'tcp'});
    signal?.throwIfAborted();
    if(url.protocol==='https:'){conn=await runtime.startTls(conn,{hostname:url.hostname,alpnProtocols:['http/1.1']});signal?.throwIfAborted();}
    const request=new TextEncoder().encode('GET '+url.pathname+url.search+' HTTP/1.1\r\nHost: '+url.host+'\r\nAccept: text/html,application/xhtml+xml\r\nAccept-Encoding: identity\r\nUser-Agent: ScopeX-Homepage-Check/1.0\r\nConnection: close\r\n\r\n');
    let offset=0;while(offset<request.length)offset+=await conn.write(request.subarray(offset));
    return await readHttpResponse(conn);
  }finally{signal?.removeEventListener('abort',close);close();}
}
