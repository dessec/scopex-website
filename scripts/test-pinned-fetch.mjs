import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createPinnedFetcher } from '../lib/pinned-fetch.mjs';
const dns=(addresses)=>async(input)=>Response.json({Status:0,Answer:input.endsWith('type=A')?addresses.map(data=>({type:1,data})):[]});
test('pins the connection to a validated IP while retaining the TLS and HTTP hostname',async()=>{
 let options;
 const request=(o,cb)=>{options=o;const req=new EventEmitter();req.end=()=>{const res=Readable.from([Buffer.from('<html><h1>Hello</h1></html>')]);res.statusCode=200;res.headers={'content-type':'text/html'};cb(res);};return req;};
 const fetcher=createPinnedFetcher({dnsFetch:dns(['93.184.216.34']),https:request});
 const r=await fetcher('https://customer.com/start?q=1');
 assert.equal(r.status,200);assert.match(await r.text(),/Hello/);
 assert.equal(options.hostname,'93.184.216.34');assert.equal(options.servername,'customer.com');assert.equal(options.headers.host,'customer.com');assert.equal(options.path,'/start?q=1');assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);
});
test('private DNS answers never reach the connection layer',async()=>{
 let connected=false;const fetcher=createPinnedFetcher({dnsFetch:dns(['93.184.216.34','127.0.0.1']),https:()=>{connected=true;}});
 await assert.rejects(fetcher('https://customer.com'),/public website/);assert.equal(connected,false);
});
test('missing DNS answer fails closed',async()=>{
 const fetcher=createPinnedFetcher({dnsFetch:dns([])});await assert.rejects(fetcher('https://customer.com'),/public website/);
});
