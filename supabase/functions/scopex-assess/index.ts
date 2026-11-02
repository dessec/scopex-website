import { analyzeHtml } from "../../../lib/assessment.mjs";
import { fetchHomepage, normalizeWebsite } from "../../../lib/public-homepage.mjs";
import { pinnedFetch } from "../../../lib/pinned-fetch.mjs";

const allowed = new Set(["https://scopex.co","https://www.scopex.co","https://dessec.github.io","http://127.0.0.1:5190"]);
const baseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Origin"};
class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
async function limitedJson(request:Request) {
  if(Number(request.headers.get("content-length"))>2048)throw new ApiError(413,"The request is too large.");
  const reader=request.body?.getReader();
  if(!reader)throw new ApiError(400,"Enter a website address.");
  const timeout=setTimeout(()=>reader.cancel(),5000);
  try {
    let count=0,text="";
    const decoder=new TextDecoder();
    for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>2048){await reader.cancel();throw new ApiError(413,"The request is too large.");}text+=decoder.decode(value,{stream:true});}
    text+=decoder.decode();
    try{return JSON.parse(text);}catch{throw new ApiError(400,"Enter a valid website address.");}
  } finally{clearTimeout(timeout);}
}
async function rateLimit(request:Request) {
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const api=Deno.env.get("SUPABASE_URL");
  if(!key||!api)throw new ApiError(503,"The website check is temporarily unavailable.");
  const rawIp=request.headers.get("x-forwarded-for")?.split(",").map(x=>x.trim()).filter(Boolean).at(-1)||"unknown";
  const signingKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  // Daily pseudonyms; raw client IP addresses are never written to the database.
  const digest=await crypto.subtle.sign("HMAC",signingKey,new TextEncoder().encode(new Date().toISOString().slice(0,10)+":"+rawIp));
  const bucket=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
  for(const [name,limit] of [["global",120],["ip:"+bucket,6]] as const){
    let response:Response;
    try{response=await fetch(api+"/rest/v1/rpc/scopex_take_scan_slot",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({p_bucket:name,p_limit:limit}),signal:AbortSignal.timeout(5000)});}
    catch{throw new ApiError(503,"The website check is temporarily unavailable.");}
    if(!response.ok)throw new ApiError(503,"The website check is temporarily unavailable.");
    if(await response.json()!==true)throw new ApiError(429,"Please wait a minute before running another check.");
  }
}
Deno.serve(async(request:Request)=>{
  const origin=request.headers.get("origin")||"";
  const cors=allowed.has(origin)?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"600"}:{};
  const headers={...baseHeaders,...cors};
  const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{...headers,...(status===429?{"Retry-After":"60"}:{})}});
  if(!allowed.has(origin))return respond({error:"Please run the check from the ScopeX website."},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(request.method!=="POST")return respond({error:"Use the website check form."},405);
  if(!request.headers.get("content-type")?.includes("application/json"))return respond({error:"Use the website check form."},415);
  try {
    const body=await limitedJson(request);
    if(!body || typeof body!=="object" || typeof body.url!=="string")throw new ApiError(400,"Enter a website address.");
    const url=normalizeWebsite(body.url).href;
    await rateLimit(request);
    const page=await fetchHomepage(url,pinnedFetch);
    const result=analyzeHtml(page);
    if(/\b(?:noindex|none)\b/i.test(page.robotsHeader)){
      const category=result.categories.find(c=>c.id==="search-foundations");
      const check=category?.checks.find(c=>c.id==="indexability");
      if(check&&category){check.passed=false;check.evidence="An X-Robots-Tag response header requests no indexing.";check.recommendation="Review this header if this page should appear in search results.";category.score=Math.round(100*category.checks.filter(c=>c.passed).length/category.checks.length);}
      const checks=result.categories.flatMap(c=>c.checks),count=checks.filter(c=>c.passed).length;
      result.score=Math.round(100*count/checks.length);
      result.summary=count+" of "+checks.length+" observable signals detected ("+result.score+"%). Not a conversion rate.";
    }
    return respond({...result,sample:false});
  } catch(error) {
    return respond({error:error instanceof Error?error.message:"We could not check this website."},error instanceof ApiError?error.status:422);
  }
});
