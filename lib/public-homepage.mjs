// One public homepage, bounded redirects/body/time. Never forwards visitor credentials.
export function normalizeWebsite(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 250) throw new Error('Enter a public website address, such as yourbusiness.com.');
  const raw = input.trim();
  if (/\s/.test(raw)) throw new Error('A website address cannot contain spaces.');
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`); }
  catch { throw new Error('Enter a valid website address, such as yourbusiness.com.'); }
  assertPublicUrl(url);
  return new URL(url.origin + '/');
}
export function assertPublicUrl(url) {
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Use a public HTTP or HTTPS website without a login or custom port.');
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (hostname !== url.hostname || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname) || /(?:^|\.)(?:localhost|local|internal|intranet|test|invalid|example|onion|home|lan|arpa)$/.test(hostname)) throw new Error('Use a publicly accessible domain name. Local addresses and IP addresses are not supported.');
}
export function publicAddress(address) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(address)) {
    const parts = address.split('.').map(Number); const [a,b,c] = parts;
    if (parts.some(x => x < 0 || x > 255)) return false;
    return !(a===0 || a===10 || a===127 || a>=224 || (a===100 && b>=64 && b<=127) || (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && (b===168 || b===0 || (b===88 && c===99))) || (a===198 && (b===18 || b===19 || (b===51 && c===100))) || (a===203 && b===0 && c===113));
  }
  // Only global-unicast IPv6; excludes mapped IPv4, local, link-local, multicast and transition ranges.
  if (!/^[23][0-9a-f]{3}:/i.test(address) || /\./.test(address)) return false;
  if (/^(?:2001:(?:0*:|0*2:|0*db8:|0*10:|0*20:)|2002:|3fff:)/i.test(address)) return false;
  return true;
}
export async function verifyPublicDns(hostname, fetcher, signal) {
  const records = await Promise.all(['A','AAAA'].map(async type => {
    const response = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal, redirect: 'manual' });
    if (!response.ok) throw new Error('We could not verify this website address. Please try again.');
    const data = await response.json();
    if (![0,3].includes(data.Status)) throw new Error('The website address could not be resolved.');
    return (data.Answer || []).filter(x => x.type===1 || x.type===28).map(x => x.data);
  }));
  const addresses=records.flat();
  if (!addresses.length) throw new Error('This domain did not resolve to a public website. Check the address and try again.');
  if (addresses.some(x => !publicAddress(x))) throw new Error('This address does not resolve exclusively to a public website.');
}
export async function fetchHomepage(input, fetcher = fetch) {
  let url = normalizeWebsite(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  const started = Date.now();
  try {
    for (let redirects=0; redirects<=4; redirects++) {
      assertPublicUrl(url);
      await verifyPublicDns(url.hostname, fetcher, controller.signal);
      const response = await fetcher(url.href, { redirect:'manual', signal:controller.signal, headers:{ accept:'text/html,application/xhtml+xml', 'User-Agent':'ScopeX-Homepage-Check/1.0' } });
      if ([301,302,303,307,308].includes(response.status)) {
        await response.body?.cancel();
        if (redirects===4) throw new Error('This website redirected too many times to complete the check.');
        const location = response.headers.get('location');
        if (!location) throw new Error('The website returned an incomplete redirect.');
        url = new URL(location,url); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`The website returned HTTP ${response.status}. It may block automated checks. Try again or ask us for a manual review.`); }
      if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')||'')) { await response.body?.cancel(); throw new Error('This address did not return a web page. Enter your main website address.'); }
      if (Number(response.headers.get('content-length'))>1500000) { await response.body?.cancel(); throw new Error('This homepage is too large for the quick check. A manual review would be more useful.'); }
      const reader=response.body?.getReader(); if(!reader) throw new Error('The website returned an empty page.');
      const decoder=new TextDecoder(); let html='',bytes=0;
      while(true) { const {done,value}=await reader.read(); if(done)break; bytes+=value.byteLength; if(bytes>1500000){await reader.cancel();throw new Error('This homepage is too large for the quick check. A manual review would be more useful.');} html+=decoder.decode(value,{stream:true}); }
      html+=decoder.decode();
      if (!/<(?:html|head|body|title|main|h1|div)\b/i.test(html)) throw new Error('The website did not return enough page content for a useful check.');
      if (/(?:cf-chl-|challenge-platform|<title>\s*(?:just a moment|access denied|attention required|robot check))/i.test(html)) throw new Error('This website uses a bot-protection page. A manual review is needed; we have not scored that protection page.');
      return {html,url:url.href,status:response.status,elapsedMs:Date.now()-started,robotsHeader:response.headers.get('x-robots-tag')||''};
    }
    throw new Error('The website could not be checked.');
  } catch(error) {
    if(controller.signal.aborted) throw new Error('The website took too long to respond. Try again or ask us for a manual review.');
    if(error instanceof TypeError) throw new Error('We could not reach this website. It may be unavailable or block automated checks.');
    throw error;
  } finally { clearTimeout(timeout); }
}
