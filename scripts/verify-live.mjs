import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const sandbox={window:{}};vm.runInNewContext(await readFile(new URL('../public/config.js',import.meta.url),'utf8'),sandbox);
const {assessmentApiUrl,supabaseAnonKey}=sandbox.window.SCOPEX_CONFIG;
const headers={Origin:'https://scopex.co','Content-Type':'application/json',apikey:supabaseAnonKey,Authorization:'Bearer '+supabaseAnonKey};
const tests=[
 ['preflight',{method:'OPTIONS',headers:{Origin:'https://scopex.co','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}},204],
 ['missing JWT',{method:'POST',headers:{Origin:'https://scopex.co','Content-Type':'application/json'},body:'{"url":"https://lumn.ca"}'},401],
 ['wrong origin',{method:'POST',headers:{...headers,Origin:'https://unrelated.example'},body:'{"url":"https://lumn.ca"}'},403],
 ['private address',{method:'POST',headers,body:'{"url":"http://127.0.0.1"}'},422],
 ['oversized',{method:'POST',headers,body:JSON.stringify({url:'https://lumn.ca',padding:'x'.repeat(2100)})},413],
 ['live homepage',{method:'POST',headers,body:'{"url":"https://lumn.ca"}'},200]
];
let failed=0;
for(const [name,options,expected] of tests){const response=await fetch(assessmentApiUrl,{...options,signal:AbortSignal.timeout(30000)});let body=await response.text();try{body=JSON.parse(body);}catch{};const ok=response.status===expected;failed+=Number(!ok);console.log(JSON.stringify({name,status:response.status,expected,ok,cors:response.headers.get('access-control-allow-origin'),body}));}
process.exitCode=failed?1:0;
